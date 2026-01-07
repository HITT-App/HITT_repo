import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentLayout } from "@/components/assessment/AssessmentLayout";
import { WelcomeStep } from "@/components/assessment/steps/WelcomeStep";
import { NameStep } from "@/components/assessment/steps/NameStep";
import { GoalsStep } from "@/components/assessment/steps/GoalsStep";
import { BirthDateStep } from "@/components/assessment/steps/BirthDateStep";
import { GenderStep } from "@/components/assessment/steps/GenderStep";
import { WeightStep } from "@/components/assessment/steps/WeightStep";
import { HeightStep } from "@/components/assessment/steps/HeightStep";
import { BloodTypeStep } from "@/components/assessment/steps/BloodTypeStep";
import { FitnessExperienceStep } from "@/components/assessment/steps/FitnessExperienceStep";
import { FitnessLevelStep } from "@/components/assessment/steps/FitnessLevelStep";
import { SleepLevelStep } from "@/components/assessment/steps/SleepLevelStep";
import { ActivityTypeStep } from "@/components/assessment/steps/ActivityTypeStep";
import { MoodStep } from "@/components/assessment/steps/MoodStep";
import { EatingHabitsStep } from "@/components/assessment/steps/EatingHabitsStep";
import { CalorieIntakeStep } from "@/components/assessment/steps/CalorieIntakeStep";
import { MedicationsStep } from "@/components/assessment/steps/MedicationsStep";
import { PhysicalLimitationsStep } from "@/components/assessment/steps/PhysicalLimitationsStep";
import { SupplementsStep } from "@/components/assessment/steps/SupplementsStep";
import { FitnessNotesStep } from "@/components/assessment/steps/FitnessNotesStep";

interface AssessmentData {
  name: string;
  goals: string[];
  birthDate: { month: string; day: string; year: string };
  gender: string;
  customGender: string;
  weight: number;
  weightUnit: "lbs" | "kg";
  height: number;
  heightUnit: "cm" | "inch";
  bloodType: string;
  bloodRh: "+" | "-";
  hasFitnessExperience: boolean | null;
  fitnessLevel: number;
  sleepLevel: number;
  activities: string[];
  mood: string;
  eatingHabits: string;
  calorieIntake: number;
  takesMedications: boolean | null;
  physicalLimitations: string[];
  takesSupplements: boolean | null;
  fitnessNotes: string;
}

const Assessment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AssessmentData>({
    name: "",
    goals: [],
    birthDate: { month: "Jan", day: "01", year: "2000" },
    gender: "",
    customGender: "",
    weight: 140,
    weightUnit: "lbs",
    height: 170,
    heightUnit: "cm",
    bloodType: "A",
    bloodRh: "+",
    hasFitnessExperience: null,
    fitnessLevel: 3,
    sleepLevel: 3,
    activities: [],
    mood: "happy",
    eatingHabits: "",
    calorieIntake: 2000,
    takesMedications: null,
    physicalLimitations: [],
    takesSupplements: null,
    fitnessNotes: "",
  });

  const totalSteps = 19;

  const handleBack = () => {
    if (step === 0) {
      navigate("/auth");
    } else {
      setStep(step - 1);
    }
  };

  const handleSkip = () => setStep(step + 1);
  const handleContinue = () => {
    if (step >= totalSteps - 1) {
      localStorage.setItem("hiit_assessment_complete", "true");
      navigate("/");
    } else {
      setStep(step + 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep onContinue={handleContinue} />;
      case 1:
        return <NameStep value={data.name} onChange={(v) => setData({ ...data, name: v })} onContinue={handleContinue} />;
      case 2:
        return <GoalsStep value={data.goals} onChange={(v) => setData({ ...data, goals: v })} onContinue={handleContinue} />;
      case 3:
        return <BirthDateStep value={data.birthDate} onChange={(v) => setData({ ...data, birthDate: v })} onContinue={handleContinue} />;
      case 4:
        return <GenderStep value={data.gender} customGender={data.customGender} onChange={(v) => setData({ ...data, gender: v })} onCustomChange={(v) => setData({ ...data, customGender: v })} onContinue={handleContinue} />;
      case 5:
        return <WeightStep value={data.weight} unit={data.weightUnit} onChange={(v) => setData({ ...data, weight: v })} onUnitChange={(u) => setData({ ...data, weightUnit: u })} onContinue={handleContinue} />;
      case 6:
        return <HeightStep value={data.height} unit={data.heightUnit} onChange={(v) => setData({ ...data, height: v })} onUnitChange={(u) => setData({ ...data, heightUnit: u })} onContinue={handleContinue} />;
      case 7:
        return <BloodTypeStep type={data.bloodType} rh={data.bloodRh} onTypeChange={(v) => setData({ ...data, bloodType: v })} onRhChange={(v) => setData({ ...data, bloodRh: v })} onContinue={handleContinue} />;
      case 8:
        return <FitnessExperienceStep value={data.hasFitnessExperience} onChange={(v) => setData({ ...data, hasFitnessExperience: v })} onContinue={handleContinue} />;
      case 9:
        return <FitnessLevelStep value={data.fitnessLevel} onChange={(v) => setData({ ...data, fitnessLevel: v })} onContinue={handleContinue} />;
      case 10:
        return <SleepLevelStep value={data.sleepLevel} onChange={(v) => setData({ ...data, sleepLevel: v })} onContinue={handleContinue} />;
      case 11:
        return <ActivityTypeStep value={data.activities} onChange={(v) => setData({ ...data, activities: v })} onContinue={handleContinue} />;
      case 12:
        return <MoodStep value={data.mood} onChange={(v) => setData({ ...data, mood: v })} onContinue={handleContinue} />;
      case 13:
        return <EatingHabitsStep value={data.eatingHabits} onChange={(v) => setData({ ...data, eatingHabits: v })} onContinue={handleContinue} />;
      case 14:
        return <CalorieIntakeStep value={data.calorieIntake} onChange={(v) => setData({ ...data, calorieIntake: v })} onContinue={handleContinue} />;
      case 15:
        return <MedicationsStep value={data.takesMedications} onChange={(v) => setData({ ...data, takesMedications: v })} onContinue={handleContinue} />;
      case 16:
        return <PhysicalLimitationsStep value={data.physicalLimitations} onChange={(v) => setData({ ...data, physicalLimitations: v })} onContinue={handleContinue} />;
      case 17:
        return <SupplementsStep takeSupplements={data.takesSupplements} onTakeChange={(v) => setData({ ...data, takesSupplements: v })} onContinue={handleContinue} />;
      case 18:
        return <FitnessNotesStep value={data.fitnessNotes} onChange={(v) => setData({ ...data, fitnessNotes: v })} onContinue={handleContinue} />;
      default:
        return null;
    }
  };

  if (step === 0) {
    return <WelcomeStep onContinue={handleContinue} />;
  }

  return (
    <AssessmentLayout currentStep={step} totalSteps={totalSteps} onBack={handleBack} onSkip={handleSkip}>
      {renderStep()}
    </AssessmentLayout>
  );
};

export default Assessment;
