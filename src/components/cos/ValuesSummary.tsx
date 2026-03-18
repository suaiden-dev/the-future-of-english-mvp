import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const ValuesSummary = () => {
  const { t } = useTranslation();

  const values = [
    { label: t("processes.cos.step1.title"), price: 400, included: true },
    { label: t("processes.shared.applicationFee.title"), price: 350, included: true },
    { label: t("processes.shared.placementFee.title"), price: 0, isVariable: true, included: true },
    { label: t("processes.shared.legalFees.title"), price: 1800, included: true },
  ];

  const totalRequired = 400 + 350 + 1800;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("processes.shared.values.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("processes.shared.values.subtitleCos")}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Values List */}
            <div className="divide-y divide-border">
              {values.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.included ? "bg-accent" : "bg-muted"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 ${
                          item.included ? "text-accent-foreground" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <span className="text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">
                    {item.isVariable ? t("processes.shared.values.variable") : `$${item.price.toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-muted p-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("processes.shared.values.total")}:</span>
                <span className="text-2xl font-bold text-gradient">
                   ${totalRequired.toLocaleString()} + {t("processes.shared.values.variable")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center italic">
                * A Taxa de Colocação varia de acordo com o valor da bolsa obtida.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValuesSummary;