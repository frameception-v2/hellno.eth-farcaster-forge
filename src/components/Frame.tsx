"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

const QUIZ_QUESTIONS = [
  {
    question: "Where is Guillermo Rauch originally from?",
    options: ["Buenos Aires, Argentina", "São Paulo, Brazil", "Santiago, Chile", "Lima, Peru"],
    correct: 0
  },
  {
    question: "Which popular Node.js library did Rauch create?",
    options: ["Express", "Socket.IO", "React", "TypeScript"],
    correct: 1
  },
  {
    question: "What company did Rauch found?",
    options: ["Vercel", "Automattic", "MooTools", "LearnBoost"],
    correct: 0
  },
  {
    question: "What JavaScript framework did Rauch help create?",
    options: ["Next.js", "Angular", "Svelte", "Vue"],
    correct: 0
  }
];

function QuizQuestion({ 
  question, 
  options, 
  selected,
  onSelect 
}: { 
  question: string; 
  options: string[]; 
  selected?: number;
  onSelect: (index: number) => void; 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{question}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {options.map((option, index) => (
          <button
            key={option}
            onClick={() => onSelect(index)}
            className={`p-2 text-left rounded-md ${
              selected === index 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {option}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number>();
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        <div className="space-y-4">
          {!quizComplete ? (
            <>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}</span>
                <span>Score: {score}/{QUIZ_QUESTIONS.length}</span>
              </div>
              <QuizQuestion
                question={QUIZ_QUESTIONS[currentQuestion].question}
                options={QUIZ_QUESTIONS[currentQuestion].options}
                selected={selectedAnswer}
                onSelect={(index) => {
                  setSelectedAnswer(index);
                  const isCorrect = index === QUIZ_QUESTIONS[currentQuestion].correct;
                  setScore(s => s + (isCorrect ? 1 : 0));
                  
                  setTimeout(() => {
                    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
                      setCurrentQuestion(c => c + 1);
                      setSelectedAnswer(undefined);
                    } else {
                      setQuizComplete(true);
                    }
                  }, 1000);
                }}
              />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Quiz Complete! 🎉</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-xl mb-4">
                  Final Score: {score}/{QUIZ_QUESTIONS.length}
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Based on Guillermo Rauch's bio from rauchg.com/about
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
