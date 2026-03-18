import { FileText, Shield, Receipt, Info } from "lucide-react";
import ProcessStep from "../cos/ProcessStep";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import PlacementFeeModal from "../shared/PlacementFeeModal";

const ProcessSteps = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const steps = [
    {
      step: 1,
      title: t("processes.transfer.step1.title"),
      price: t("processes.transfer.step1.price"),
      description: t("processes.transfer.step1.description"),
      items: t("processes.transfer.step1.items", { returnObjects: true }) as string[],
      colorClass: "bg-teal",
      icon: <FileText className="w-6 h-6" />,
    },
    {
      step: 2,
      title: t("processes.shared.applicationFee.title"),
      price: t("processes.shared.applicationFee.price"),
      description: t("processes.shared.applicationFee.descriptionShort"),
      items: t("processes.shared.applicationFee.items", { returnObjects: true }) as string[],
      colorClass: "bg-emerald-500",
      icon: <Receipt className="w-6 h-6" />,
    },
    {
      step: 3,
      title: t("processes.shared.placementFee.title"),
      price: t("processes.shared.placementFee.price"),
      description: t("processes.shared.placementFee.descriptionTransfer"),
      items: t("processes.shared.placementFee.items", { returnObjects: true }) as string[],
      colorClass: "bg-coral",
      icon: <Shield className="w-6 h-6" />,
      actionButton: (
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 rounded-full bg-white text-foreground shadow-lg hover:bg-white/90 transition-all flex items-center gap-1.5 px-4 transform hover:scale-105 active:scale-95"
          title={t("processes.shared.placementFee.viewTable")}
        >
          <Info className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider">{t("processes.shared.placementFee.viewTable")}</span>
        </button>
      )
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("processes.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("processes.transfer.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="opacity-0 animate-fade-up"
              style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'forwards' }}
            >
              <ProcessStep {...step} />
            </div>
          ))}
        </div>
      </div>
      <PlacementFeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default ProcessSteps;
