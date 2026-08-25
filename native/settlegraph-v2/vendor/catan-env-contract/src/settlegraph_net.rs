//! Dependency-free CTNN-v2 inference for the structured SettleGraph network.

use std::collections::BTreeMap;
use std::path::Path;

use catan_core::board::{NUM_EDGES, NUM_TILES, NUM_VERTICES};

use crate::codec::NUM_ACTIONS;
use crate::obs_v2::OBS_V2_DIM;
use crate::settlegraph_contract::{
    action_descriptors, settlegraph_contract_sha256, topology_contract, LocationKind,
};

const ENTITY: usize = 64;
const GLOBAL: usize = 128;
const RELATION: usize = 16;
const BLOCKS: usize = 4;
const NUM_PLAYERS: usize = 2;
const NUM_RELATIONS: usize = 14;
const RMS_EPSILON: f32 = 1e-5;

#[derive(Debug)]
struct Tensor {
    shape: Vec<usize>,
    values: Vec<f32>,
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, count: usize, context: &str) -> Result<&'a [u8], String> {
        let end = self
            .offset
            .checked_add(count)
            .ok_or_else(|| format!("CTNN-v2 {context} length overflow"))?;
        let result = self
            .bytes
            .get(self.offset..end)
            .ok_or_else(|| format!("CTNN-v2 {context} is truncated"))?;
        self.offset = end;
        Ok(result)
    }

    fn u8(&mut self, context: &str) -> Result<u8, String> {
        Ok(self.take(1, context)?[0])
    }

    fn u16(&mut self, context: &str) -> Result<u16, String> {
        Ok(u16::from_le_bytes(
            self.take(2, context)?.try_into().expect("checked length"),
        ))
    }

    fn u32(&mut self, context: &str) -> Result<u32, String> {
        Ok(u32::from_le_bytes(
            self.take(4, context)?.try_into().expect("checked length"),
        ))
    }

    fn u64(&mut self, context: &str) -> Result<u64, String> {
        Ok(u64::from_le_bytes(
            self.take(8, context)?.try_into().expect("checked length"),
        ))
    }

    fn f32(&mut self, context: &str) -> Result<f32, String> {
        let value = f32::from_le_bytes(self.take(4, context)?.try_into().expect("checked length"));
        if !value.is_finite() {
            return Err(format!("CTNN-v2 {context} contains a non-finite value"));
        }
        Ok(value)
    }
}

#[derive(Debug)]
struct Dense {
    input: usize,
    output: usize,
    weight: Vec<f32>,
    bias: Vec<f32>,
}

impl Dense {
    fn take(
        tensors: &mut BTreeMap<String, Tensor>,
        prefix: &str,
        output: usize,
        input: usize,
    ) -> Result<Self, String> {
        Ok(Self {
            input,
            output,
            weight: take_values(tensors, &format!("{prefix}.weight"), &[output, input])?,
            bias: take_values(tensors, &format!("{prefix}.bias"), &[output])?,
        })
    }

    fn forward(&self, input: &[f32], output: &mut [f32]) {
        debug_assert_eq!(input.len(), self.input);
        debug_assert_eq!(output.len(), self.output);
        for (row, value) in output.iter_mut().enumerate() {
            let weights = &self.weight[row * self.input..(row + 1) * self.input];
            let mut sum = self.bias[row];
            for (&weight, &input) in weights.iter().zip(input) {
                sum += weight * input;
            }
            *value = sum;
        }
    }

    fn forward_three(&self, a: &[f32], b: &[f32], c: &[f32], output: &mut [f32]) {
        debug_assert_eq!(a.len() + b.len() + c.len(), self.input);
        debug_assert_eq!(output.len(), self.output);
        for (row, value) in output.iter_mut().enumerate() {
            let weights = &self.weight[row * self.input..(row + 1) * self.input];
            let mut sum = self.bias[row];
            for (&weight, &input) in weights.iter().zip(a.iter().chain(b).chain(c)) {
                sum += weight * input;
            }
            *value = sum;
        }
    }

    fn add_rmsnorm_scaled(
        &self,
        input: &[f32],
        norm_weight: &[f32],
        scale: f32,
        output: &mut [f32],
    ) {
        debug_assert_eq!(input.len(), self.input);
        debug_assert_eq!(norm_weight.len(), self.input);
        let square_sum = input.iter().map(|value| value * value).sum::<f32>();
        let inverse_rms = (square_sum / self.input as f32 + RMS_EPSILON)
            .sqrt()
            .recip();
        for (row, target) in output.iter_mut().enumerate() {
            let weights = &self.weight[row * self.input..(row + 1) * self.input];
            let mut sum = self.bias[row];
            for ((&weight, &input), &norm) in weights.iter().zip(input).zip(norm_weight) {
                sum += weight * input * inverse_rms * norm;
            }
            *target += scale * sum;
        }
    }
}

#[derive(Debug)]
struct Mlp {
    first: Dense,
    second: Dense,
}

impl Mlp {
    fn take(
        tensors: &mut BTreeMap<String, Tensor>,
        prefix: &str,
        input: usize,
        hidden: usize,
        output: usize,
    ) -> Result<Self, String> {
        Ok(Self {
            first: Dense::take(tensors, &format!("{prefix}.0"), hidden, input)?,
            second: Dense::take(tensors, &format!("{prefix}.2"), output, hidden)?,
        })
    }
}

#[derive(Debug)]
struct RelationProjection {
    down: Dense,
    up: Dense,
}

impl RelationProjection {
    fn take(tensors: &mut BTreeMap<String, Tensor>, prefix: &str) -> Result<Self, String> {
        Ok(Self {
            down: Dense::take(tensors, &format!("{prefix}.down"), RELATION, ENTITY)?,
            up: Dense::take(tensors, &format!("{prefix}.up"), ENTITY, RELATION)?,
        })
    }
}

#[derive(Debug)]
struct SettleGraphBlock {
    gates: [f32; 5],
    entity_norms: [Vec<f32>; 4],
    global_norm: Vec<f32>,
    relations: Vec<RelationProjection>,
    global_to_entity: [Dense; 4],
    entity_updates: [Mlp; 4],
    pool_projections: [Dense; 4],
    global_update: Mlp,
}

impl SettleGraphBlock {
    fn take(tensors: &mut BTreeMap<String, Tensor>, index: usize) -> Result<Self, String> {
        let root = format!("blocks.{index}");
        let scalar = |tensors: &mut BTreeMap<String, Tensor>, name: &str| {
            take_values(tensors, &format!("{root}.{name}"), &[]).map(|values| values[0])
        };
        let entity_names = ["tile", "vertex", "edge", "player"];
        let mut relations = Vec::with_capacity(NUM_RELATIONS);
        for name in [
            "tile_tile",
            "tile_vertex",
            "tile_edge",
            "vertex_vertex",
            "vertex_tile",
            "vertex_edge",
            "vertex_player",
            "edge_edge",
            "edge_tile",
            "edge_vertex",
            "edge_player",
            "player_player",
            "player_vertex",
            "player_edge",
        ] {
            relations.push(RelationProjection::take(
                tensors,
                &format!("{root}.relations.{name}"),
            )?);
        }
        let global_to_entity = try_array(entity_names.map(|name| {
            Dense::take(
                tensors,
                &format!("{root}.global_to_entity.{name}"),
                ENTITY,
                GLOBAL,
            )
        }))?;
        let entity_updates = try_array(entity_names.map(|name| {
            Mlp::take(
                tensors,
                &format!("{root}.entity_updates.{name}"),
                3 * ENTITY,
                ENTITY,
                ENTITY,
            )
        }))?;
        let pool_projections = try_array(entity_names.map(|name| {
            Dense::take(
                tensors,
                &format!("{root}.pool_projections.{name}"),
                ENTITY,
                2 * ENTITY,
            )
        }))?;
        Ok(Self {
            gates: [
                scalar(tensors, "tile_gate")?,
                scalar(tensors, "vertex_gate")?,
                scalar(tensors, "edge_gate")?,
                scalar(tensors, "player_gate")?,
                scalar(tensors, "global_gate")?,
            ],
            entity_norms: [
                take_values(tensors, &format!("{root}.tile_norm.weight"), &[ENTITY])?,
                take_values(tensors, &format!("{root}.vertex_norm.weight"), &[ENTITY])?,
                take_values(tensors, &format!("{root}.edge_norm.weight"), &[ENTITY])?,
                take_values(tensors, &format!("{root}.player_norm.weight"), &[ENTITY])?,
            ],
            global_norm: take_values(tensors, &format!("{root}.global_norm.weight"), &[GLOBAL])?,
            relations,
            global_to_entity,
            entity_updates,
            pool_projections,
            global_update: Mlp::take(
                tensors,
                &format!("{root}.global_update"),
                GLOBAL + ENTITY,
                GLOBAL,
                GLOBAL,
            )?,
        })
    }
}

fn try_array<T, const N: usize>(values: [Result<T, String>; N]) -> Result<[T; N], String> {
    let values = values.into_iter().collect::<Result<Vec<_>, _>>()?;
    values
        .try_into()
        .map_err(|_| "internal CTNN-v2 array accounting mismatch".to_owned())
}

fn take_values(
    tensors: &mut BTreeMap<String, Tensor>,
    name: &str,
    shape: &[usize],
) -> Result<Vec<f32>, String> {
    let tensor = tensors
        .remove(name)
        .ok_or_else(|| format!("CTNN-v2 is missing tensor {name:?}"))?;
    if tensor.shape != shape {
        return Err(format!(
            "CTNN-v2 tensor {name:?} shape mismatch: expected {shape:?}, received {:?}",
            tensor.shape
        ));
    }
    Ok(tensor.values)
}

/// Reusable native SettleGraph buffers. `forward_raw` never allocates or grows a vector.
pub struct SettleGraphScratch {
    tile: [f32; NUM_TILES * ENTITY],
    tile_next: [f32; NUM_TILES * ENTITY],
    tile_messages: [f32; NUM_TILES * ENTITY],
    vertex: [f32; NUM_VERTICES * ENTITY],
    vertex_next: [f32; NUM_VERTICES * ENTITY],
    vertex_messages: [f32; NUM_VERTICES * ENTITY],
    edge: [f32; NUM_EDGES * ENTITY],
    edge_next: [f32; NUM_EDGES * ENTITY],
    edge_messages: [f32; NUM_EDGES * ENTITY],
    player: [f32; NUM_PLAYERS * ENTITY],
    player_next: [f32; NUM_PLAYERS * ENTITY],
    player_messages: [f32; NUM_PLAYERS * ENTITY],
    global: [f32; GLOBAL],
    global_next: [f32; GLOBAL],
    global_messages: [f32; GLOBAL],
    action_keys: [f32; NUM_ACTIONS * ENTITY],
    vertex_owner: [[f32; NUM_PLAYERS]; NUM_VERTICES],
    edge_owner: [[f32; NUM_PLAYERS]; NUM_EDGES],
    work192: [f32; 192],
    work128: [f32; 128],
    work64: [f32; 64],
    work16: [f32; 16],
}

impl Default for SettleGraphScratch {
    fn default() -> Self {
        Self {
            tile: [0.0; NUM_TILES * ENTITY],
            tile_next: [0.0; NUM_TILES * ENTITY],
            tile_messages: [0.0; NUM_TILES * ENTITY],
            vertex: [0.0; NUM_VERTICES * ENTITY],
            vertex_next: [0.0; NUM_VERTICES * ENTITY],
            vertex_messages: [0.0; NUM_VERTICES * ENTITY],
            edge: [0.0; NUM_EDGES * ENTITY],
            edge_next: [0.0; NUM_EDGES * ENTITY],
            edge_messages: [0.0; NUM_EDGES * ENTITY],
            player: [0.0; NUM_PLAYERS * ENTITY],
            player_next: [0.0; NUM_PLAYERS * ENTITY],
            player_messages: [0.0; NUM_PLAYERS * ENTITY],
            global: [0.0; GLOBAL],
            global_next: [0.0; GLOBAL],
            global_messages: [0.0; GLOBAL],
            action_keys: [0.0; NUM_ACTIONS * ENTITY],
            vertex_owner: [[0.0; NUM_PLAYERS]; NUM_VERTICES],
            edge_owner: [[0.0; NUM_PLAYERS]; NUM_EDGES],
            work192: [0.0; 192],
            work128: [0.0; 128],
            work64: [0.0; 64],
            work16: [0.0; 16],
        }
    }
}

/// Parsed CTNN-v2 model with typed matrices matching the Python state layout.
pub struct SettleGraphNet {
    contract_sha256: [u8; 32],
    tile_encoder: Dense,
    vertex_encoder: Dense,
    edge_encoder: Dense,
    player_encoder: Dense,
    global_encoder: Dense,
    blocks: Vec<SettleGraphBlock>,
    policy_context: Mlp,
    family_embedding: Vec<f32>,
    family_query: Mlp,
    location_projections: [Dense; 4],
    give_resource_embedding: Vec<f32>,
    receive_resource_embedding: Vec<f32>,
    development_embedding: Vec<f32>,
    mode_embedding: Vec<f32>,
    action_key_norm: Vec<f32>,
    action_bias: Vec<f32>,
    value_head: Mlp,
}

impl SettleGraphNet {
    pub fn load(path: &Path) -> Result<Self, String> {
        let bytes = std::fs::read(path)
            .map_err(|error| format!("cannot read CTNN-v2 {}: {error}", path.display()))?;
        Self::from_bytes(&bytes)
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self, String> {
        let mut reader = Reader::new(bytes);
        if reader.take(4, "magic")? != b"CTNN" {
            return Err("CTNN-v2 magic mismatch".to_owned());
        }
        let header = [
            reader.u32("version")?,
            reader.u32("observation dimension")?,
            reader.u32("action count")?,
            reader.u32("entity width")?,
            reader.u32("global width")?,
            reader.u32("block count")?,
            reader.u32("relation width")?,
        ];
        let expected = [
            2,
            OBS_V2_DIM as u32,
            NUM_ACTIONS as u32,
            ENTITY as u32,
            GLOBAL as u32,
            BLOCKS as u32,
            RELATION as u32,
        ];
        if header != expected {
            return Err(format!(
                "CTNN-v2 header mismatch: expected {expected:?}, received {header:?}"
            ));
        }
        let contract_sha256: [u8; 32] = reader
            .take(32, "contract hash")?
            .try_into()
            .expect("checked length");
        let expected_contract = settlegraph_contract_sha256();
        if contract_sha256 != expected_contract {
            return Err("CTNN-v2 SettleGraph contract hash mismatch".to_owned());
        }
        let tensor_count = reader.u32("tensor count")? as usize;
        if tensor_count == 0 || tensor_count > 4_096 {
            return Err("CTNN-v2 tensor count is invalid".to_owned());
        }
        let mut tensors = BTreeMap::new();
        let mut previous_name: Option<String> = None;
        for _ in 0..tensor_count {
            let name_length = reader.u16("tensor name length")? as usize;
            if name_length == 0 {
                return Err("CTNN-v2 tensor name is empty".to_owned());
            }
            let name = std::str::from_utf8(reader.take(name_length, "tensor name")?)
                .map_err(|_| "CTNN-v2 tensor name is not UTF-8".to_owned())?
                .to_owned();
            if previous_name
                .as_ref()
                .is_some_and(|previous| name <= *previous)
            {
                return Err("CTNN-v2 tensor names are not unique and sorted".to_owned());
            }
            previous_name = Some(name.clone());
            let rank = reader.u8("tensor rank")? as usize;
            if rank > 8 {
                return Err(format!("CTNN-v2 tensor {name:?} rank is too large"));
            }
            let mut shape = Vec::with_capacity(rank);
            let mut expected_count = 1usize;
            for _ in 0..rank {
                let dimension = reader.u32("tensor dimension")? as usize;
                expected_count = expected_count
                    .checked_mul(dimension)
                    .ok_or_else(|| format!("CTNN-v2 tensor {name:?} element count overflow"))?;
                shape.push(dimension);
            }
            let count = usize::try_from(reader.u64("tensor float count")?)
                .map_err(|_| format!("CTNN-v2 tensor {name:?} count is too large"))?;
            if count != expected_count {
                return Err(format!(
                    "CTNN-v2 tensor {name:?} count does not match shape"
                ));
            }
            let byte_count = count
                .checked_mul(4)
                .ok_or_else(|| format!("CTNN-v2 tensor {name:?} byte count overflow"))?;
            let encoded = reader.take(byte_count, "tensor values")?;
            let mut values = Vec::with_capacity(count);
            for chunk in encoded.chunks_exact(4) {
                let value = f32::from_le_bytes(chunk.try_into().expect("exact chunks"));
                if !value.is_finite() {
                    return Err(format!(
                        "CTNN-v2 tensor {name:?} contains a non-finite value"
                    ));
                }
                values.push(value);
            }
            if tensors
                .insert(name.clone(), Tensor { shape, values })
                .is_some()
            {
                return Err(format!("CTNN-v2 tensor {name:?} is duplicated"));
            }
        }

        let mut probe = [0.0; OBS_V2_DIM];
        for value in &mut probe {
            *value = reader.f32("probe observation")?;
        }
        let expected_value = reader.f32("probe value")?;
        let mut expected_logits = [0.0; NUM_ACTIONS];
        for value in &mut expected_logits {
            *value = reader.f32("probe logits")?;
        }
        if reader.offset != bytes.len() {
            return Err("CTNN-v2 has extra trailing bytes".to_owned());
        }

        let tile_encoder = Dense::take(&mut tensors, "tile_encoder.0", ENTITY, 10)?;
        let vertex_encoder = Dense::take(&mut tensors, "vertex_encoder.0", ENTITY, 16)?;
        let edge_encoder = Dense::take(&mut tensors, "edge_encoder.0", ENTITY, 6)?;
        let player_encoder = Dense::take(&mut tensors, "player_encoder.0", ENTITY, 44)?;
        let global_encoder = Dense::take(&mut tensors, "global_encoder.0", GLOBAL, 121)?;
        let mut blocks = Vec::with_capacity(BLOCKS);
        for index in 0..BLOCKS {
            blocks.push(SettleGraphBlock::take(&mut tensors, index)?);
        }
        let policy_context = Mlp::take(&mut tensors, "policy_context", 256, 128, ENTITY)?;
        let family_embedding = take_values(&mut tensors, "family_embedding.weight", &[19, ENTITY])?;
        let family_query = Mlp::take(&mut tensors, "family_query", 128, ENTITY, 65)?;
        let location_projections = try_array(["tile", "vertex", "edge", "player"].map(|name| {
            Dense::take(
                &mut tensors,
                &format!("location_projections.{name}"),
                ENTITY,
                ENTITY,
            )
        }))?;
        let give_resource_embedding =
            take_values(&mut tensors, "give_resource_embedding.weight", &[5, ENTITY])?;
        let receive_resource_embedding = take_values(
            &mut tensors,
            "receive_resource_embedding.weight",
            &[5, ENTITY],
        )?;
        let development_embedding =
            take_values(&mut tensors, "development_embedding.weight", &[5, ENTITY])?;
        let mode_embedding = take_values(&mut tensors, "mode_embedding.weight", &[21, ENTITY])?;
        let action_key_norm = take_values(&mut tensors, "action_key_norm.weight", &[ENTITY])?;
        let action_bias = take_values(&mut tensors, "action_bias", &[NUM_ACTIONS])?;
        let value_head = Mlp::take(&mut tensors, "value_head", 256, GLOBAL, 1)?;
        if let Some(unexpected) = tensors.keys().next() {
            return Err(format!("CTNN-v2 has unexpected tensor {unexpected:?}"));
        }

        let net = Self {
            contract_sha256,
            tile_encoder,
            vertex_encoder,
            edge_encoder,
            player_encoder,
            global_encoder,
            blocks,
            policy_context,
            family_embedding,
            family_query,
            location_projections,
            give_resource_embedding,
            receive_resource_embedding,
            development_embedding,
            mode_embedding,
            action_key_norm,
            action_bias,
            value_head,
        };
        let mut scratch = net.new_scratch();
        let mut actual_logits = [0.0; NUM_ACTIONS];
        let actual_value = net.forward_raw(&probe, &mut scratch, &mut actual_logits)?;
        if (actual_value - expected_value).abs() > 1e-4 {
            return Err(format!(
                "CTNN-v2 probe value mismatch: {actual_value} != {expected_value}"
            ));
        }
        let max_logit_error = actual_logits
            .iter()
            .zip(expected_logits)
            .map(|(actual, expected)| (actual - expected).abs())
            .fold(0.0f32, f32::max);
        if max_logit_error > 1e-4 {
            return Err(format!(
                "CTNN-v2 probe logits mismatch: maximum error {max_logit_error}"
            ));
        }
        Ok(net)
    }

    pub fn contract_sha256(&self) -> [u8; 32] {
        self.contract_sha256
    }

    pub fn new_scratch(&self) -> SettleGraphScratch {
        SettleGraphScratch::default()
    }
}

fn row(values: &[f32], index: usize) -> &[f32] {
    &values[index * ENTITY..(index + 1) * ENTITY]
}

fn row_mut(values: &mut [f32], index: usize) -> &mut [f32] {
    &mut values[index * ENTITY..(index + 1) * ENTITY]
}

fn silu(values: &mut [f32]) {
    for value in values {
        *value /= 1.0 + (-*value).exp();
    }
}

fn rmsnorm(input: &[f32], weight: &[f32], output: &mut [f32]) {
    let inverse_rms = (input.iter().map(|value| value * value).sum::<f32>() / input.len() as f32
        + RMS_EPSILON)
        .sqrt()
        .recip();
    for ((output, input), weight) in output.iter_mut().zip(input).zip(weight) {
        *output = input * inverse_rms * weight;
    }
}

fn rmsnorm_in_place(values: &mut [f32], weight: &[f32]) {
    let inverse_rms = (values.iter().map(|value| value * value).sum::<f32>() / values.len() as f32
        + RMS_EPSILON)
        .sqrt()
        .recip();
    for (value, weight) in values.iter_mut().zip(weight) {
        *value *= inverse_rms * weight;
    }
}

fn finish_relation(
    relation: &RelationProjection,
    target: &mut [f32],
    pooled: &[f32; RELATION],
    projected: &mut [f32; ENTITY],
) {
    relation.up.forward(pooled, projected);
    for (target, projected) in target.iter_mut().zip(projected.iter()) {
        *target += projected;
    }
}

fn add_signed_relation<const TARGETS: usize, const WIDTH: usize>(
    relation: &RelationProjection,
    norm: &[f32],
    sources: &[f32],
    rows: &[[i8; WIDTH]; TARGETS],
    messages: &mut [f32],
    pooled: &mut [f32; RELATION],
    projected: &mut [f32; ENTITY],
) {
    for (target_index, neighbors) in rows.iter().enumerate() {
        pooled.fill(0.0);
        let count = neighbors.iter().filter(|neighbor| **neighbor >= 0).count();
        if count == 0 {
            continue;
        }
        let scale = 1.0 / count as f32;
        for &source_index in neighbors.iter().filter(|neighbor| **neighbor >= 0) {
            relation.down.add_rmsnorm_scaled(
                row(sources, source_index as usize),
                norm,
                scale,
                pooled,
            );
        }
        finish_relation(relation, row_mut(messages, target_index), pooled, projected);
    }
}

fn add_unsigned_relation<const TARGETS: usize, const WIDTH: usize>(
    relation: &RelationProjection,
    norm: &[f32],
    sources: &[f32],
    rows: &[[u8; WIDTH]; TARGETS],
    messages: &mut [f32],
    pooled: &mut [f32; RELATION],
    projected: &mut [f32; ENTITY],
) {
    let scale = 1.0 / WIDTH as f32;
    for (target_index, neighbors) in rows.iter().enumerate() {
        pooled.fill(0.0);
        for &source_index in neighbors {
            relation.down.add_rmsnorm_scaled(
                row(sources, source_index as usize),
                norm,
                scale,
                pooled,
            );
        }
        finish_relation(relation, row_mut(messages, target_index), pooled, projected);
    }
}

fn add_owner_to_location<const LOCATIONS: usize>(
    relation: &RelationProjection,
    player_norm: &[f32],
    players: &[f32],
    ownership: &[[f32; NUM_PLAYERS]; LOCATIONS],
    messages: &mut [f32],
    pooled: &mut [f32; RELATION],
    projected: &mut [f32; ENTITY],
) {
    for (target_index, owners) in ownership.iter().enumerate() {
        pooled.fill(0.0);
        let mut has_owner = false;
        for (player, &scale) in owners.iter().enumerate() {
            if scale != 0.0 {
                has_owner = true;
                relation
                    .down
                    .add_rmsnorm_scaled(row(players, player), player_norm, scale, pooled);
            }
        }
        if has_owner {
            finish_relation(relation, row_mut(messages, target_index), pooled, projected);
        }
    }
}

fn add_location_to_owner<const LOCATIONS: usize>(
    relation: &RelationProjection,
    location_norm: &[f32],
    locations: &[f32],
    ownership: &[[f32; NUM_PLAYERS]; LOCATIONS],
    messages: &mut [f32],
    pooled: &mut [f32; RELATION],
    projected: &mut [f32; ENTITY],
) {
    for player in 0..NUM_PLAYERS {
        pooled.fill(0.0);
        let count = ownership.iter().map(|owners| owners[player]).sum::<f32>();
        if count == 0.0 {
            continue;
        }
        let denominator = count.max(1.0);
        for (location, owners) in ownership.iter().enumerate() {
            let scale = owners[player] / denominator;
            if scale != 0.0 {
                relation.down.add_rmsnorm_scaled(
                    row(locations, location),
                    location_norm,
                    scale,
                    pooled,
                );
            }
        }
        finish_relation(relation, row_mut(messages, player), pooled, projected);
    }
}

fn add_edge_neighbors(
    relation: &RelationProjection,
    edge_norm: &[f32],
    edges: &[f32],
    messages: &mut [f32],
    pooled: &mut [f32; RELATION],
    projected: &mut [f32; ENTITY],
) {
    let topology = topology_contract();
    for edge in 0..NUM_EDGES {
        let mut neighbors = [usize::MAX; 4];
        let mut count = 0;
        for &vertex in &topology.edge_vertices[edge] {
            for &other in &topology.vertex_edges[vertex as usize] {
                if other >= 0 {
                    let other = other as usize;
                    if other != edge && !neighbors[..count].contains(&other) {
                        neighbors[count] = other;
                        count += 1;
                    }
                }
            }
        }
        pooled.fill(0.0);
        let scale = 1.0 / count as f32;
        for &neighbor in &neighbors[..count] {
            relation
                .down
                .add_rmsnorm_scaled(row(edges, neighbor), edge_norm, scale, pooled);
        }
        finish_relation(relation, row_mut(messages, edge), pooled, projected);
    }
}

#[allow(clippy::too_many_arguments)]
fn update_entities(
    block: &SettleGraphBlock,
    kind: usize,
    state: &[f32],
    messages: &[f32],
    next: &mut [f32],
    global: &[f32; GLOBAL],
    work192: &mut [f32; 192],
    work128: &mut [f32; 128],
    work64: &mut [f32; 64],
) {
    let count = state.len() / ENTITY;
    block.global_to_entity[kind].forward(global, &mut work192[2 * ENTITY..]);
    for index in 0..count {
        rmsnorm(
            row(state, index),
            &block.entity_norms[kind],
            &mut work192[..ENTITY],
        );
        work192[ENTITY..2 * ENTITY].copy_from_slice(row(messages, index));
        block.entity_updates[kind]
            .first
            .forward(work192, &mut work128[..ENTITY]);
        silu(&mut work128[..ENTITY]);
        block.entity_updates[kind]
            .second
            .forward(&work128[..ENTITY], work64);
        for ((next, old), update) in row_mut(next, index)
            .iter_mut()
            .zip(row(state, index))
            .zip(work64.iter())
        {
            *next = old + block.gates[kind] * update;
        }
    }
}

fn add_pool(
    projection: &Dense,
    states: &[f32],
    pooled: &mut [f32],
    work128: &mut [f32; 128],
    work64: &mut [f32; 64],
) {
    let count = states.len() / ENTITY;
    for feature in 0..ENTITY {
        let mut sum = 0.0;
        let mut maximum = f32::NEG_INFINITY;
        for index in 0..count {
            let value = states[index * ENTITY + feature];
            sum += value;
            maximum = maximum.max(value);
        }
        work128[feature] = sum / count as f32;
        work128[ENTITY + feature] = maximum;
    }
    projection.forward(work128, work64);
    for (pooled, update) in pooled.iter_mut().zip(work64.iter()) {
        *pooled += update;
    }
}

fn run_block(block: &SettleGraphBlock, scratch: &mut SettleGraphScratch) {
    scratch.tile_messages.fill(0.0);
    scratch.vertex_messages.fill(0.0);
    scratch.edge_messages.fill(0.0);
    scratch.player_messages.fill(0.0);
    let topology = topology_contract();
    add_signed_relation(
        &block.relations[0],
        &block.entity_norms[0],
        &scratch.tile,
        &topology.tile_neighbors,
        &mut scratch.tile_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_unsigned_relation(
        &block.relations[1],
        &block.entity_norms[1],
        &scratch.vertex,
        &topology.tile_vertices,
        &mut scratch.tile_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_signed_relation(
        &block.relations[2],
        &block.entity_norms[2],
        &scratch.edge,
        &topology.tile_edges,
        &mut scratch.tile_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_signed_relation(
        &block.relations[3],
        &block.entity_norms[1],
        &scratch.vertex,
        &topology.vertex_neighbors,
        &mut scratch.vertex_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_signed_relation(
        &block.relations[4],
        &block.entity_norms[0],
        &scratch.tile,
        &topology.vertex_tiles,
        &mut scratch.vertex_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_signed_relation(
        &block.relations[5],
        &block.entity_norms[2],
        &scratch.edge,
        &topology.vertex_edges,
        &mut scratch.vertex_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_owner_to_location(
        &block.relations[6],
        &block.entity_norms[3],
        &scratch.player,
        &scratch.vertex_owner,
        &mut scratch.vertex_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_edge_neighbors(
        &block.relations[7],
        &block.entity_norms[2],
        &scratch.edge,
        &mut scratch.edge_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_signed_relation(
        &block.relations[8],
        &block.entity_norms[0],
        &scratch.tile,
        &topology.edge_tiles,
        &mut scratch.edge_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_unsigned_relation(
        &block.relations[9],
        &block.entity_norms[1],
        &scratch.vertex,
        &topology.edge_vertices,
        &mut scratch.edge_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_owner_to_location(
        &block.relations[10],
        &block.entity_norms[3],
        &scratch.player,
        &scratch.edge_owner,
        &mut scratch.edge_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    const PLAYER_OTHER: [[i8; 1]; NUM_PLAYERS] = [[1], [0]];
    add_signed_relation(
        &block.relations[11],
        &block.entity_norms[3],
        &scratch.player,
        &PLAYER_OTHER,
        &mut scratch.player_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_location_to_owner(
        &block.relations[12],
        &block.entity_norms[1],
        &scratch.vertex,
        &scratch.vertex_owner,
        &mut scratch.player_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );
    add_location_to_owner(
        &block.relations[13],
        &block.entity_norms[2],
        &scratch.edge,
        &scratch.edge_owner,
        &mut scratch.player_messages,
        &mut scratch.work16,
        &mut scratch.work64,
    );

    update_entities(
        block,
        0,
        &scratch.tile,
        &scratch.tile_messages,
        &mut scratch.tile_next,
        &scratch.global,
        &mut scratch.work192,
        &mut scratch.work128,
        &mut scratch.work64,
    );
    update_entities(
        block,
        1,
        &scratch.vertex,
        &scratch.vertex_messages,
        &mut scratch.vertex_next,
        &scratch.global,
        &mut scratch.work192,
        &mut scratch.work128,
        &mut scratch.work64,
    );
    update_entities(
        block,
        2,
        &scratch.edge,
        &scratch.edge_messages,
        &mut scratch.edge_next,
        &scratch.global,
        &mut scratch.work192,
        &mut scratch.work128,
        &mut scratch.work64,
    );
    update_entities(
        block,
        3,
        &scratch.player,
        &scratch.player_messages,
        &mut scratch.player_next,
        &scratch.global,
        &mut scratch.work192,
        &mut scratch.work128,
        &mut scratch.work64,
    );

    scratch.global_messages.fill(0.0);
    add_pool(
        &block.pool_projections[0],
        &scratch.tile_next,
        &mut scratch.global_messages[..ENTITY],
        &mut scratch.work128,
        &mut scratch.work64,
    );
    add_pool(
        &block.pool_projections[1],
        &scratch.vertex_next,
        &mut scratch.global_messages[..ENTITY],
        &mut scratch.work128,
        &mut scratch.work64,
    );
    add_pool(
        &block.pool_projections[2],
        &scratch.edge_next,
        &mut scratch.global_messages[..ENTITY],
        &mut scratch.work128,
        &mut scratch.work64,
    );
    add_pool(
        &block.pool_projections[3],
        &scratch.player_next,
        &mut scratch.global_messages[..ENTITY],
        &mut scratch.work128,
        &mut scratch.work64,
    );
    rmsnorm(
        &scratch.global,
        &block.global_norm,
        &mut scratch.work192[..GLOBAL],
    );
    scratch.work192[GLOBAL..].copy_from_slice(&scratch.global_messages[..ENTITY]);
    block
        .global_update
        .first
        .forward(&scratch.work192, &mut scratch.work128);
    silu(&mut scratch.work128);
    block
        .global_update
        .second
        .forward(&scratch.work128, &mut scratch.global_next);
    let global_gate = block.gates[4];
    for (next, old) in scratch.global_next.iter_mut().zip(scratch.global) {
        *next = old + global_gate * *next;
    }

    std::mem::swap(&mut scratch.tile, &mut scratch.tile_next);
    std::mem::swap(&mut scratch.vertex, &mut scratch.vertex_next);
    std::mem::swap(&mut scratch.edge, &mut scratch.edge_next);
    std::mem::swap(&mut scratch.player, &mut scratch.player_next);
    std::mem::swap(&mut scratch.global, &mut scratch.global_next);
}

impl SettleGraphNet {
    fn encode_observation(&self, obs: &[f32; OBS_V2_DIM], scratch: &mut SettleGraphScratch) {
        let topology = topology_contract();
        for tile in 0..NUM_TILES {
            scratch.work64[..8].copy_from_slice(&obs[tile * 8..tile * 8 + 8]);
            let degree = topology.tile_neighbors[tile]
                .iter()
                .filter(|neighbor| **neighbor >= 0)
                .count();
            scratch.work64[8] = degree as f32 / 6.0;
            scratch.work64[9] = f32::from(degree < 6);
            self.tile_encoder
                .forward(&scratch.work64[..10], row_mut(&mut scratch.tile, tile));
            silu(row_mut(&mut scratch.tile, tile));
        }
        for vertex in 0..NUM_VERTICES {
            let raw_offset = 152 + vertex * 14;
            scratch.work64[..14].copy_from_slice(&obs[raw_offset..raw_offset + 14]);
            let tile_count = topology.vertex_tiles[vertex]
                .iter()
                .filter(|tile| **tile >= 0)
                .count();
            let degree = topology.vertex_neighbors[vertex]
                .iter()
                .filter(|neighbor| **neighbor >= 0)
                .count();
            scratch.work64[14] = tile_count as f32 / 3.0;
            scratch.work64[15] = degree as f32 / 3.0;
            scratch.vertex_owner[vertex] = [
                (obs[raw_offset] + obs[raw_offset + 1]).clamp(0.0, 1.0),
                (obs[raw_offset + 2] + obs[raw_offset + 3]).clamp(0.0, 1.0),
            ];
            self.vertex_encoder
                .forward(&scratch.work64[..16], row_mut(&mut scratch.vertex, vertex));
            silu(row_mut(&mut scratch.vertex, vertex));
        }
        for edge in 0..NUM_EDGES {
            let raw_offset = 908 + edge * 4;
            scratch.work64[..4].copy_from_slice(&obs[raw_offset..raw_offset + 4]);
            let tile_count = topology.edge_tiles[edge]
                .iter()
                .filter(|tile| **tile >= 0)
                .count();
            scratch.work64[4] = tile_count as f32 / 2.0;
            scratch.work64[5] = f32::from(tile_count < 2);
            scratch.edge_owner[edge] = [
                obs[raw_offset].clamp(0.0, 1.0),
                obs[raw_offset + 1].clamp(0.0, 1.0),
            ];
            self.edge_encoder
                .forward(&scratch.work64[..6], row_mut(&mut scratch.edge, edge));
            silu(row_mut(&mut scratch.edge, edge));
        }

        for player in 0..NUM_PLAYERS {
            let mut cursor = 0;
            let public_offset = 1196 + player * 17;
            scratch.work64[cursor..cursor + 17]
                .copy_from_slice(&obs[public_offset..public_offset + 17]);
            cursor += 17;
            if player == 0 {
                scratch.work64[cursor..cursor + 15].copy_from_slice(&obs[1264..1279]);
            } else {
                scratch.work64[cursor..cursor + 15].fill(0.0);
            }
            cursor += 15;
            scratch.work64[cursor] = f32::from(player == 0);
            scratch.work64[cursor + 1] = f32::from(player == 1);
            cursor += 2;
            if player == 0 {
                scratch.work64[cursor..cursor + 5].copy_from_slice(&obs[1264..1269]);
            } else {
                for resource in 0..5 {
                    scratch.work64[cursor + resource] = obs[1350 + resource] / 19.0;
                }
            }
            cursor += 5;
            scratch.work64[cursor] = obs[1433 + player] / 25.0;
            cursor += 1;
            for development in 0..4 {
                scratch.work64[cursor + development] = obs[1435 + player * 4 + development] / 25.0;
            }
            cursor += 4;
            debug_assert_eq!(cursor, 44);
            self.player_encoder
                .forward(&scratch.work64[..44], row_mut(&mut scratch.player, player));
            silu(row_mut(&mut scratch.player, player));
        }

        let mut cursor = 0;
        scratch.work192[cursor..cursor + 41].copy_from_slice(&obs[1309..1350]);
        cursor += 41;
        const PAIR_DIVISORS: [f32; 11] = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0];
        for index in 0..11 {
            scratch.work192[cursor + index] = obs[1355 + index] / PAIR_DIVISORS[index];
        }
        cursor += 11;
        scratch.work192[cursor..cursor + 60].copy_from_slice(&obs[1366..1426]);
        cursor += 60;
        for index in 0..3 {
            scratch.work192[cursor + index] = obs[1426 + index] / 500.0;
        }
        cursor += 3;
        scratch.work192[cursor..cursor + 3].copy_from_slice(&obs[1429..1432]);
        cursor += 3;
        scratch.work192[cursor] = obs[1432] / 500.0;
        cursor += 1;
        scratch.work192[cursor] = obs[1443] / 25.0;
        cursor += 1;
        scratch.work192[cursor] = obs[1444];
        cursor += 1;
        debug_assert_eq!(cursor, 121);
        self.global_encoder
            .forward(&scratch.work192[..121], &mut scratch.global);
        silu(&mut scratch.global);
    }

    fn build_action_keys(&self, scratch: &mut SettleGraphScratch) {
        for (action, descriptor) in action_descriptors().iter().enumerate() {
            let key = row_mut(&mut scratch.action_keys, action);
            key.fill(0.0);
            match descriptor.location_kind {
                LocationKind::Tile if descriptor.primary_index >= 0 => {
                    self.location_projections[0]
                        .forward(row(&scratch.tile, descriptor.primary_index as usize), key);
                }
                LocationKind::Vertex if descriptor.primary_index >= 0 => {
                    self.location_projections[1]
                        .forward(row(&scratch.vertex, descriptor.primary_index as usize), key);
                }
                LocationKind::Edge if descriptor.primary_index >= 0 => {
                    self.location_projections[2]
                        .forward(row(&scratch.edge, descriptor.primary_index as usize), key);
                }
                LocationKind::Player
                    if (0..NUM_PLAYERS as i8).contains(&descriptor.target_player_slot) =>
                {
                    self.location_projections[3].forward(
                        row(&scratch.player, descriptor.target_player_slot as usize),
                        key,
                    );
                }
                _ => {}
            }
            for resource in 0..5 {
                let give = descriptor.give_resources[resource] as f32;
                let receive = descriptor.receive_resources[resource] as f32;
                for (feature, key) in key.iter_mut().enumerate() {
                    *key += give * self.give_resource_embedding[resource * ENTITY + feature]
                        + receive * self.receive_resource_embedding[resource * ENTITY + feature];
                }
            }
            if descriptor.development_type >= 0 {
                let offset = descriptor.development_type as usize * ENTITY;
                for (feature, key) in key.iter_mut().enumerate() {
                    *key += self.development_embedding[offset + feature];
                }
            }
            let mode_offset = descriptor.mode as usize * ENTITY;
            for (feature, key) in key.iter_mut().enumerate() {
                *key += self.mode_embedding[mode_offset + feature];
            }
            rmsnorm_in_place(key, &self.action_key_norm);
        }
    }

    pub fn forward_raw(
        &self,
        obs: &[f32; OBS_V2_DIM],
        scratch: &mut SettleGraphScratch,
        logits: &mut [f32; NUM_ACTIONS],
    ) -> Result<f32, String> {
        if obs.iter().any(|value| !value.is_finite()) {
            return Err("SettleGraph observation contains a non-finite value".to_owned());
        }
        self.encode_observation(obs, scratch);
        for block in &self.blocks {
            run_block(block, scratch);
        }

        self.policy_context.first.forward_three(
            &scratch.global,
            row(&scratch.player, 0),
            row(&scratch.player, 1),
            &mut scratch.work128,
        );
        silu(&mut scratch.work128);
        self.policy_context
            .second
            .forward(&scratch.work128, &mut scratch.global_messages[..ENTITY]);
        self.build_action_keys(scratch);
        let mut active_family = usize::MAX;
        for (action, descriptor) in action_descriptors().iter().enumerate() {
            let family = descriptor.family as usize;
            if family != active_family {
                scratch.work128[..ENTITY].copy_from_slice(&scratch.global_messages[..ENTITY]);
                let family_offset = family * ENTITY;
                scratch.work128[ENTITY..]
                    .copy_from_slice(&self.family_embedding[family_offset..family_offset + ENTITY]);
                self.family_query
                    .first
                    .forward(&scratch.work128, &mut scratch.work64);
                silu(&mut scratch.work64);
                self.family_query
                    .second
                    .forward(&scratch.work64, &mut scratch.work128[..65]);
                active_family = family;
            }
            let dot = scratch.work128[..ENTITY]
                .iter()
                .zip(row(&scratch.action_keys, action))
                .map(|(query, key)| query * key)
                .sum::<f32>();
            logits[action] = scratch.work128[ENTITY] + dot / 8.0 + self.action_bias[action];
        }

        self.value_head.first.forward_three(
            &scratch.global,
            row(&scratch.player, 0),
            row(&scratch.player, 1),
            &mut scratch.work128,
        );
        silu(&mut scratch.work128);
        self.value_head
            .second
            .forward(&scratch.work128, &mut scratch.work64[..1]);
        let value = scratch.work64[0].tanh();
        if !value.is_finite() || logits.iter().any(|logit| !logit.is_finite()) {
            return Err("SettleGraph forward produced a non-finite output".to_owned());
        }
        Ok(value)
    }
}
