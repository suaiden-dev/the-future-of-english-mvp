import Header from "@/components/initial/Header";
import PromiseSection from "@/components/shared/PromiseSection";
import ProcessSteps from "@/components/initial/ProcessSteps";
import FundsSummary from "@/components/initial/FundsSummary";
import ValuesSummary from "@/components/initial/ValuesSummary";
import ClientsSection from "@/components/shared/ClientsSection";
import ContactForm from "@/components/shared/ContactForm";
import Footer from "@/components/initial/Footer";
import ChatBot from "@/components/shared/Chatbot";
import { useTranslation } from "react-i18next";

const Initial = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromiseSection text={t("processes.initial.promise")} />
      <ClientsSection />
      <ProcessSteps />
      <FundsSummary />
      <ValuesSummary />
      <ContactForm />
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Initial;
