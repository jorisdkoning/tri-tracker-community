export interface GettingStartedInput {
  hasConnection: boolean;
  hasWorkout: boolean;
  hasCheckIn: boolean;
  hasEventOrGoal: boolean;
  hasMeal: boolean;
}

export interface GettingStartedStep {
  id: keyof GettingStartedInput;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

export function gettingStartedSteps(input: GettingStartedInput): GettingStartedStep[] {
  return [
    {
      id: "hasConnection",
      label: "Connect your watch or phone",
      hint: "Intervals.icu or Apple Health brings your workouts and sleep in automatically.",
      href: "/settings",
      done: input.hasConnection,
    },
    {
      id: "hasWorkout",
      label: "Add your first workout",
      hint: "Synced automatically, or add one by hand on the Training page.",
      href: "/training",
      done: input.hasWorkout,
    },
    {
      id: "hasCheckIn",
      label: "Tell us how you feel today",
      hint: "One tap on the dashboard. It helps spot when you need rest.",
      href: "/#check-in",
      done: input.hasCheckIn,
    },
    {
      id: "hasEventOrGoal",
      label: "Set an event or goal",
      hint: "A race, a trip or just \"run 10 km\" gives you something to aim for.",
      href: "/races",
      done: input.hasEventOrGoal,
    },
    {
      id: "hasMeal",
      label: "Log a meal",
      hint: "Type it in, or just tell Claude what you ate.",
      href: "/nutrition",
      done: input.hasMeal,
    },
  ];
}
