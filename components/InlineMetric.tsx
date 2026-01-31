export default function InlineMetric({ stat }: { stat: string }) {
  const num = Number(stat);
  // Only use BigInt for very large integers, otherwise use Number
  const metric = Number.isInteger(num) && num > Number.MAX_SAFE_INTEGER 
    ? BigInt(Math.floor(num)) 
    : num;
  return (
    <span className="-mx-0.5 animate-[mutation_2s_ease-in-out_1] rounded-md px-0.5 slashed-zero tabular-nums tracking-tight">
      {new Intl.NumberFormat().format(metric)}
    </span>
  );
}
