from __future__ import annotations

import argparse
import csv
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Plot eval-curve CSV files produced by settlex_puffer.eval_curve."
    )
    parser.add_argument("--csv", nargs="+", required=True, help="One or more curve CSV paths.")
    parser.add_argument(
        "--labels",
        type=str,
        default="",
        help="Comma-separated labels matching --csv order.",
    )
    parser.add_argument("--x-field", type=str, default="checkpoint_update")
    parser.add_argument("--y-field", type=str, default="win_rate_mean")
    parser.add_argument("--ci-field", type=str, default="win_rate_std")
    parser.add_argument(
        "--show-ci",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Draw +/- CI field as a light band.",
    )
    parser.add_argument("--title", type=str, default="Settlex PPO Eval Curve")
    parser.add_argument("--xlabel", type=str, default="Update")
    parser.add_argument("--ylabel", type=str, default="Win Rate")
    parser.add_argument("--out", type=str, required=True, help="Output PNG path.")
    return parser.parse_args()


def load_curve(path: Path, x_field: str, y_field: str, ci_field: str):
    rows = []
    with path.open("r", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if not row.get(x_field) or not row.get(y_field):
                continue
            try:
                x = float(row[x_field])
                y = float(row[y_field])
                ci = float(row.get(ci_field, "0") or 0)
            except ValueError:
                continue
            rows.append((x, y, ci))
    rows.sort(key=lambda item: item[0])
    return rows


def main() -> None:
    args = parse_args()
    csv_paths = [Path(item).expanduser().resolve() for item in args.csv]
    for path in csv_paths:
        if not path.exists():
            raise FileNotFoundError(f"CSV not found: {path}")

    labels = [item.strip() for item in args.labels.split(",") if item.strip()]
    if labels and len(labels) != len(csv_paths):
        raise ValueError("If provided, --labels must match the number of --csv files.")

    try:
        import matplotlib.pyplot as plt
    except ImportError as exc:
        raise RuntimeError(
            "matplotlib is required for plotting. Install it in the venv and rerun."
        ) from exc

    plt.figure(figsize=(10, 5.5))

    for index, path in enumerate(csv_paths):
        label = labels[index] if labels else path.stem
        rows = load_curve(path, args.x_field, args.y_field, args.ci_field)
        if not rows:
            continue
        x = [item[0] for item in rows]
        y = [item[1] for item in rows]
        ci = [item[2] for item in rows]
        plt.plot(x, y, marker="o", linewidth=1.8, markersize=4, label=label)
        if args.show_ci:
            lower = [max(0.0, yi - ci_i) for yi, ci_i in zip(y, ci)]
            upper = [min(1.0, yi + ci_i) for yi, ci_i in zip(y, ci)]
            plt.fill_between(x, lower, upper, alpha=0.15)

    plt.title(args.title)
    plt.xlabel(args.xlabel)
    plt.ylabel(args.ylabel)
    plt.grid(alpha=0.25, linestyle="--")
    plt.ylim(0.0, 1.0)
    plt.legend()
    plt.tight_layout()

    out_path = Path(args.out).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out_path, dpi=160)
    print(out_path)


if __name__ == "__main__":
    main()
