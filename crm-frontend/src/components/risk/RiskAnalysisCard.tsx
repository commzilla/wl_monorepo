
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskAnalysis } from '@/lib/types/risk';
import { AlertTriangle, Shield, TrendingDown, TrendingUp } from 'lucide-react';

interface RiskAnalysisCardProps {
  riskAnalysis: RiskAnalysis;
}

const RiskAnalysisCard = ({ riskAnalysis }: RiskAnalysisCardProps) => {
  const getRiskLevelColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskLevelIcon = (score: number) => {
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (score >= 40) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <Shield className="h-4 w-4 text-green-600" />;
  };

  const getRiskLevelText = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Risk Analysis
          {getRiskLevelIcon(riskAnalysis.overallRiskScore)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Risk Score</p>
            <p className={`text-2xl font-bold ${getRiskLevelColor(riskAnalysis.overallRiskScore)}`}>
              {riskAnalysis.overallRiskScore}
            </p>
            <p className="text-xs text-muted-foreground">
              {getRiskLevelText(riskAnalysis.overallRiskScore)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Breaches</p>
            <p className="text-2xl font-bold">{riskAnalysis.totalBreaches}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Soft Breaches</p>
            <p className="text-2xl font-bold text-yellow-600">{riskAnalysis.softBreaches}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Hard Breaches</p>
            <p className="text-2xl font-bold text-red-600">{riskAnalysis.hardBreaches}</p>
          </div>
        </div>

        {riskAnalysis.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">AI Recommendations</h4>
            <div className="space-y-1">
              {riskAnalysis.recommendations.map((recommendation, index) => (
                <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          Last analyzed: {riskAnalysis.lastAnalyzed.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskAnalysisCard;
