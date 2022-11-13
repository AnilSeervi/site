export default function Step({ number, title }) {
  return (
    <div className="step flex items-center gap-3 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-sm font-bold text-blue-500 dark:border-gray-800">
        {number}
      </div>
      <h4 className="m-0 text-lg font-bold tracking-tight">{title}</h4>
    </div>
  );
}
