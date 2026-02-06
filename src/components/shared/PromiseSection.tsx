interface PromiseSectionProps {
  text: string;
}

const PromiseSection = ({ text }: PromiseSectionProps) => {
  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PromiseSection;
