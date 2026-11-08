"""Deterministic one-dimensional teaching model; not a molecular simulation."""

import argparse
import math


def energy(x):
    return (x * x - 1) ** 2


def gradient(x):
    return 4 * x * (x * x - 1)


def minimize(start, rate=0.05, tolerance=1e-6, max_steps=500):
    x = start
    for step in range(max_steps + 1):
        if not math.isfinite(x) or not math.isfinite(energy(x)):
            raise ValueError("non-finite value; choose a smaller rate or start")
        if abs(gradient(x)) < tolerance:
            return step, x, energy(x), "stationary"
        if step < max_steps:
            x -= rate * gradient(x)
    return max_steps, x, energy(x), "step_limit"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--starts", type=float, nargs="+", default=[-1.5, 0.5, 0.0])
    parser.add_argument("--rate", type=float, default=0.05)
    parser.add_argument("--tolerance", type=float, default=1e-6)
    parser.add_argument("--max-steps", type=int, default=500)
    args = parser.parse_args()
    if (not math.isfinite(args.rate) or args.rate <= 0 or
            not math.isfinite(args.tolerance) or args.tolerance <= 0 or
            args.max_steps < 0 or any(not math.isfinite(x) for x in args.starts)):
        parser.error("starts must be finite; rate and tolerance positive; max-steps nonnegative")
    print("start,steps,x,energy,abs_gradient,status")
    for start in args.starts:
        try:
            steps, x, value, status = minimize(start, args.rate, args.tolerance, args.max_steps)
        except (OverflowError, ValueError):
            parser.error("calculation overflowed; choose a smaller rate or start")
        print(f"{start:.6f},{steps},{x:.6f},{value:.6f},{abs(gradient(x)):.6g},{status}")


if __name__ == "__main__":
    main()
