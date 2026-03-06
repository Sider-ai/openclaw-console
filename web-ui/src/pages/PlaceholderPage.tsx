type PlaceholderPageProps = {
  description: string;
  title: string;
};

export function PlaceholderPage({ description, title }: PlaceholderPageProps) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
    </section>
  );
}
