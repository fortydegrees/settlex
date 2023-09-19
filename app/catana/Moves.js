

export const placeSettlement = {
    move: (context, node) => {
        const { G, playerID, events } = context;

        G.nodes[node].building = "settlement";
        G.nodes[node].color = G.players[playerID].color
        //const character = getCharacter(charState);
    
        //const stage = character.placeSettlement(context, charState, pos);
        //events.setStage('road');

        updateValids(context, 'settlement')
        events.endTurn()
    
        //updateValids(context, stage);
      },
    //   redact: ({ G, ctx }) =>
    //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
}

export const placeRoad = {
    move: (context, pos) => {
        const { G, playerID, events } = context;
        const { charState } = G.players[playerID];
        const character = getCharacter(charState);
    
        const stage = character.placeSettlement(context, charState, pos);
        events.endTurn()
    
        //updateValids(context, stage);
      },
    //   redact: ({ G, ctx }) =>
    //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
}

const updateValids = ( context, stage) => {
    const { G, ctx, playerID } = context;
    switch (stage) {
        case 'road':
            G.valids.nodes = {}
            break;
        case 'settlement':
            var validNodes = {}
            for (var node of Object.keys(G.nodes)){
                var realnode = G.nodes[node]
                if (!realnode.building){
                    validNodes[node] = realnode
                }
            }
            G.valids.nodes = validNodes
    }

}