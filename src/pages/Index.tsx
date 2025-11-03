import { StressDodger } from "@/components/StressDodger";
import { Helmet } from "react-helmet";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Stress Dodger - A Calming Mindfulness Game</title>
        <meta name="description" content="Find peace with Stress Dodger. A relaxing web game where you guide a gentle leaf through falling rain. Perfect for mindful breaks and stress relief." />
      </Helmet>
      <StressDodger />
    </>
  );
};

export default Index;
