import Header from "@/components/transfer/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/transfer/ProcessSteps";
import FundsSummary from "@/components/transfer/FundsSummary";
import ValuesSummary from "@/components/transfer/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ContactForm from "@/components/shared/ContactForm";
import Footer from "@/components/transfer/Footer";
import { useTranslation } from "react-i18next";

const Transfer = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={t("processes.transfer.promise")} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Transfer;
