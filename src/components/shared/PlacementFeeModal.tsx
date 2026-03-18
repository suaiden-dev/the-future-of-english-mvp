import { X, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PlacementFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlacementFeeModal = ({ isOpen, onClose }: PlacementFeeModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const tableData = [
    { tuition: "$9.500", fee: "$100" },
    { tuition: "$9.000", fee: "$150" },
    { tuition: "$8.500", fee: "$200" },
    { tuition: "$8.000", fee: "$250" },
    { tuition: "$7.500", fee: "$300" },
    { tuition: "$7.000", fee: "$350" },
    { tuition: "$6.500", fee: "$550" },
    { tuition: "$6.000", fee: "$900" },
    { tuition: "$5.500", fee: "$1.100" },
    { tuition: "$5.000", fee: "$1.200" },
    { tuition: "$4.500", fee: "$1.450" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border animate-in fade-in zoom-in duration-300">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-foreground">
              {t("processes.shared.placementFee.modalTitle")}
            </h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t("processes.shared.placementFee.modalSubtitle")}
          </p>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    {t("processes.shared.placementFee.tuitionLabel")}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    {t("processes.shared.placementFee.feeLabel")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tableData.map((row, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-sm text-foreground">{row.tuition}</td>
                    <td className="px-4 py-2 text-sm font-bold text-accent">{row.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3">
             <div className="p-3 bg-accent/5 rounded-lg border border-accent/10 flex items-center gap-2 text-accent">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t("processes.shared.placementFee.marchPromo")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              * Honorários COS: $1.800 + $100 por cada dependente adicional
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-foreground text-background rounded-full font-bold hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlacementFeeModal;
