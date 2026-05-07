import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { Question } from "@/lib/testear/types";
import { uid } from "@/lib/testear/storage";

interface ManualQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex?: number;
  type: "multiple-choice" | "true-false" | "open-ended";
}

interface ManualQuestionInputProps {
  onQuestionsCreate: (questions: Question[]) => void;
  onCancel: () => void;
}

export function ManualQuestionInput({ onQuestionsCreate, onCancel }: ManualQuestionInputProps) {
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    {
      id: uid(),
      prompt: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      type: "multiple-choice",
    },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(questions[0]?.id);

  const addQuestion = () => {
    const newQuestion: ManualQuestion = {
      id: uid(),
      prompt: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      type: "multiple-choice",
    };
    setQuestions([...questions, newQuestion]);
    setExpandedId(newQuestion.id);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) {
      alert("You must have at least one question");
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<ManualQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      }),
    );
  };

  const updateType = (questionId: string, type: ManualQuestion["type"]) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const options =
            type === "true-false"
              ? ["True", "False"]
              : type === "open-ended"
                ? []
                : q.options.slice(0, 4);
          return {
            ...q,
            type,
            options,
            correctIndex: type === "open-ended" ? undefined : q.correctIndex,
          };
        }
        return q;
      }),
    );
  };

  const handleCreate = () => {
    // Validate questions
    const validQuestions = questions.filter((q) => q.prompt.trim().length > 0);

    if (validQuestions.length === 0) {
      alert("Please add at least one question with text");
      return;
    }

    // Convert to Question format
    const converted: Question[] = validQuestions.map((q, i) => ({
      id: uid(),
      number: i + 1,
      prompt: q.prompt.trim(),
      options: q.type === "open-ended" ? [] : q.options.filter((o) => o.trim()),
      correctIndex: q.correctIndex,
    }));

    onQuestionsCreate(converted);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create Questions Manually</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={questions.length === 0}>
            Create Questionnaire ({questions.length})
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {expandedId === question.id ? (
                    <ChevronUp className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-base">
                    Question {index + 1}
                    {question.prompt && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {question.prompt.substring(0, 60)}
                        {question.prompt.length > 60 ? "..." : ""}
                      </span>
                    )}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQuestion(question.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardHeader>

            {expandedId === question.id && (
              <CardContent className="space-y-4 border-t pt-4">
                {/* Question Type */}
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) =>
                      updateType(question.id, value as ManualQuestion["type"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                      <SelectItem value="open-ended">Open-ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label htmlFor={`prompt-${question.id}`}>Question Text *</Label>
                  <Textarea
                    id={`prompt-${question.id}`}
                    placeholder="Enter the question text..."
                    value={question.prompt}
                    onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                    className="min-h-24"
                  />
                </div>

                {/* Options */}
                {question.type !== "open-ended" && (
                  <div className="space-y-3">
                    <Label>Answer Options</Label>
                    <div className="space-y-2">
                      {question.options.map((option, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctIndex === optIdx}
                            onChange={() =>
                              updateQuestion(question.id, {
                                correctIndex: optIdx,
                              })
                            }
                            className="size-4"
                          />
                          <Input
                            placeholder={
                              question.type === "true-false"
                                ? ""
                                : `Option ${String.fromCharCode(65 + optIdx)}`
                            }
                            value={option}
                            onChange={(e) => updateOption(question.id, optIdx, e.target.value)}
                            disabled={question.type === "true-false"}
                            className="flex-1"
                          />
                          {question.correctIndex === optIdx && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the radio button next to the correct answer
                    </p>
                  </div>
                )}

                {/* Open-ended note */}
                {question.type === "open-ended" && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                    ℹ️ No predefined answers for open-ended questions. Students will provide text
                    responses.
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add Question Button */}
      <Button onClick={addQuestion} variant="outline" className="w-full">
        <Plus className="size-4 mr-2" />
        Add Another Question
      </Button>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{questions.length}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {questions.filter((q) => q.prompt.trim()).length}
              </div>
              <div className="text-sm text-muted-foreground">With Content</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {questions.reduce(
                  (sum, q) => sum + (q.options.filter((o) => o.trim()).length || 0),
                  0,
                )}
              </div>
              <div className="text-sm text-muted-foreground">Total Options</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={questions.length === 0}>
          Create Questionnaire
        </Button>
      </div>
    </div>
  );
}
