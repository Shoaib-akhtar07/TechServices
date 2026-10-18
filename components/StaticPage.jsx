import RichText from './RichText';

export default function StaticPage({ title, blocks }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-14">
      <h1 className="text-5xl font-semibold">{title}</h1>
      <div className="mt-8">
        <RichText blocks={blocks} />
      </div>
    </div>
  );
}
