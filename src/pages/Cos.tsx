import Header from "@/components/cos/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/cos/ProcessSteps";
import FundsSummary from "@/components/cos/FundsSummary";
import ValuesSummary from "@/components/cos/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ContactForm from "@/components/shared/ContactForm";
import Footer from "@/components/cos/Footer";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={t("processes.cos.promise")} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ClientsSection />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Index;
