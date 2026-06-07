import type { ExpressionMetrics } from '../features';

export interface ExpressionResult {
  expression: string;
  confidence: number;
  metadata: { rawScores: Record<string, number> };
}

/**
 * ExpressionDetector classifies facial expressions from MediaPipe blendshapes.
 * Uses a simple rolling average to prevent flickering between frames.
 */
export class ExpressionDetector {
  private lastExpression: string = 'NEUTRAL';
  private lastConfidence = 0;
  private buffer: { expression: string; confidence: number }[] = [];
  private readonly bufferSize = 5;

  update(features: ExpressionMetrics | null): ExpressionResult {
    if (!features) {
      return {
        expression: this.lastExpression,
        confidence: this.lastConfidence,
        metadata: { rawScores: {} },
      };
    }

    this.buffer.push({ expression: features.expression, confidence: features.confidence });
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // Pick the most common expression in the buffer.
    const counts = new Map<string, number>();
    for (const item of this.buffer) {
      counts.set(item.expression, (counts.get(item.expression) ?? 0) + 1);
    }
    let bestExpr = this.lastExpression;
    let bestCount = 0;
    for (const [expr, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestExpr = expr;
      }
    }

    const avgConfidence =
      this.buffer.filter((b) => b.expression === bestExpr).reduce((s, b) => s + b.confidence, 0) /
      Math.max(1, this.buffer.filter((b) => b.expression === bestExpr).length);

    this.lastExpression = bestExpr;
    this.lastConfidence = avgConfidence;

    return {
      expression: bestExpr,
      confidence: avgConfidence,
      metadata: { rawScores: features.rawScores },
    };
  }

  reset(): void {
    this.buffer = [];
    this.lastExpression = 'NEUTRAL';
    this.lastConfidence = 0;
  }
}
