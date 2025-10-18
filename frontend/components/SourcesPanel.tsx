"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn, truncateText } from "@/lib/utils";
import { RAGSource } from "@/lib/wsClient";

interface SourcesPanelProps {
  sources: RAGSource[];
  className?: string;
}

/**
 * Collapsible panel displaying RAG citations
 * Shows source title, page number, snippet, and confidence score
 */
export function SourcesPanel({ sources, className }: SourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-teal/20", className)}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-teal" />
            <CardTitle className="text-sm font-medium">
              Sources ({sources.length})
            </CardTitle>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <ScrollArea className="h-full max-h-[400px]">
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-3" />}
                  <SourceItem source={source} index={index + 1} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

interface SourceItemProps {
  source: RAGSource;
  index: number;
}

function SourceItem({ source, index }: SourceItemProps) {
  const confidencePercentage = Math.round(source.score * 100);
  const confidenceColor =
    confidencePercentage >= 80
      ? "text-green-600"
      : confidencePercentage >= 60
      ? "text-yellow-600"
      : "text-orange-600";

  return (
    <div className="space-y-2">
      {/* Source title and page */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal/10 text-teal text-xs flex items-center justify-center font-medium">
            {index}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm flex items-center space-x-1">
              <span className="truncate">{source.source}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-teal flex-shrink-0">
                p. {source.page_number}
              </span>
            </div>
          </div>
        </div>
        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
      </div>

      {/* Snippet */}
      <p className="text-xs text-muted-foreground leading-relaxed pl-7">
        {truncateText(source.snippet, 140)}
      </p>

      {/* Confidence score */}
      <div className="flex items-center space-x-2 pl-7">
        <div className="text-xs text-muted-foreground">Relevance:</div>
        <div className="flex-1 max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              confidencePercentage >= 80
                ? "bg-green-500"
                : confidencePercentage >= 60
                ? "bg-yellow-500"
                : "bg-orange-500"
            )}
            style={{ width: `${confidencePercentage}%` }}
          />
        </div>
        <div className={cn("text-xs font-medium", confidenceColor)}>
          {confidencePercentage}%
        </div>
      </div>
    </div>
  );
}
