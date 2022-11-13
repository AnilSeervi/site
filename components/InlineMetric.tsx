export default function InlineMetric({ stat }: { stat: string }) {
  const metric = +stat % 1 === 0 ? BigInt(stat) : Number(stat);
  return (
    <span className="-mx-0.5 animate-[mutation_2s_ease-in-out_1] rounded-md px-0.5 slashed-zero tabular-nums tracking-tight">
      {new Intl.NumberFormat().format(metric)}
    </span>
  );
}
