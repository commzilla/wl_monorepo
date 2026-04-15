import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Settings, ChevronDown, ChevronRight, Target, TrendingUp, Shield, Calendar, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { challengeService, Challenge, ChallengePhase } from "@/services/challengeService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

interface PhaseFormData {
  challenge: number;
  phase_type: 'phase-1' | 'phase-2' | 'live-trader';
  trading_period: string;
  min_trading_days: string;
  max_daily_loss: number;
  max_loss: number;
  profit_target: number | null;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onEdit: (challenge: Challenge) => void;
  onDelete: (id: number) => void;
  onAddPhase: (challengeId: number) => void;
  onEditPhase: (phase: ChallengePhase) => void;
  onDeletePhase: (phaseId: number) => void;
  onRefresh: () => void;
}

const ChallengeCard = ({ challenge, onEdit, onDelete, onAddPhase, onEditPhase, onDeletePhase, onRefresh }: ChallengeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const phases = challenge.phases || [];

  const getPhaseIcon = (phaseType: string) => {
    switch (phaseType) {
      case 'phase-1':
        return <Target className="h-4 w-4" />;
      case 'phase-2':
        return <TrendingUp className="h-4 w-4" />;
      case 'live-trader':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phaseType: string) => {
    switch (phaseType) {
      case 'phase-1':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'phase-2':
        return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'live-trader':
        return 'bg-green-500/10 text-green-700 border-green-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/40 hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              {challenge.name}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {challenge.step_type_display}
              </Badge>
              <Badge variant={challenge.is_active ? "default" : "secondary"} className="text-xs">
                {challenge.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(challenge)}
              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(challenge.id)}
              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{phases.length} Phase{phases.length !== 1 ? 's' : ''} Configured</span>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-4">
            <Separator />
            {phases.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No phases configured yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => onAddPhase(challenge.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Phase
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {phases.map((phase, index) => (
                   <div
                     key={phase.id}
                     className={`p-3 rounded-lg border ${getPhaseColor(phase.phase_type)} transition-colors group`}
                   >
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                         {getPhaseIcon(phase.phase_type)}
                         <span className="font-medium text-sm capitalize">
                           {phase.phase_type === 'phase-1' ? 'Phase 1' : 
                            phase.phase_type === 'phase-2' ? 'Phase 2' : 'Live Trader'}
                         </span>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                           <div className="flex items-center gap-1">
                             <Target className="h-3 w-3" />
                             {phase.profit_target ? `${phase.profit_target}%` : 'No target'}
                           </div>
                           <div className="flex items-center gap-1">
                             <Shield className="h-3 w-3" />
                             {phase.max_daily_loss}% daily
                           </div>
                         </div>
                         <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => onEditPhase(phase)}
                             className="h-6 w-6 p-0"
                           >
                             <Edit className="h-3 w-3" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => onDeletePhase(phase.id)}
                             className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </div>
                       </div>
                     </div>
                     
                     <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                       <div>
                         <span className="text-muted-foreground">Max Loss:</span>
                         <span className="ml-1 font-medium">{phase.max_loss}%</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Trading Period:</span>
                         <span className="ml-1 font-medium">{phase.trading_period}</span>
                       </div>
                     </div>
                   </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onAddPhase(challenge.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Phase
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default function ChallengeConfigurations() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ChallengePhase | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [phaseFormData, setPhaseFormData] = useState<PhaseFormData>({
    challenge: 0,
    phase_type: 'phase-1',
    trading_period: 'Unlimited',
    min_trading_days: '0',
    max_daily_loss: 4,
    max_loss: 8,
    profit_target: null,
  });
  const [formData, setFormData] = useState({
    name: "",
    step_type: "1-step" as "1-step" | "2-step",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const data = await challengeService.getChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    try {
      const newChallenge = await challengeService.createChallenge(formData);
      setChallenges([...challenges, newChallenge]);
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Challenge created successfully!",
      });
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Error",
        description: "Failed to create challenge. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateChallenge = async () => {
    if (!editingChallenge) return;
    
    try {
      const updatedChallenge = await challengeService.updateChallenge(
        editingChallenge.id,
        formData
      );
      setChallenges(challenges.map(c => 
        c.id === editingChallenge.id ? updatedChallenge : c
      ));
      setIsDialogOpen(false);
      setEditingChallenge(null);
      resetForm();
      toast({
        title: "Success",
        description: "Challenge updated successfully!",
      });
    } catch (error) {
      console.error('Error updating challenge:', error);
      toast({
        title: "Error",
        description: "Failed to update challenge. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChallenge = async (id: number) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;
    
    try {
      await challengeService.deleteChallenge(id);
      setChallenges(challenges.filter(c => c.id !== id));
      toast({
        title: "Success",
        description: "Challenge deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast({
        title: "Error",
        description: "Failed to delete challenge. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingChallenge(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      name: challenge.name,
      step_type: challenge.step_type,
      is_active: challenge.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      step_type: "1-step",
      is_active: true,
    });
  };

  // Phase management handlers
  const handleAddPhase = (challengeId: number) => {
    setSelectedChallengeId(challengeId);
    setPhaseFormData({
      ...phaseFormData,
      challenge: challengeId,
    });
    setIsPhaseDialogOpen(true);
  };

  const handleCreatePhase = async () => {
    if (!selectedChallengeId) return;
    
    try {
      const newPhase = await challengeService.createChallengePhase({
        ...phaseFormData,
        phase_type_display: phaseFormData.phase_type === 'phase-1' ? 'Phase 1' : phaseFormData.phase_type === 'phase-2' ? 'Phase 2' : 'Live Trader',
        max_daily_loss: phaseFormData.max_daily_loss.toString(),
        max_loss: phaseFormData.max_loss.toString(),
        profit_target: phaseFormData.profit_target ? phaseFormData.profit_target.toString() : null,
        min_trading_days: phaseFormData.min_trading_days.toString()
      });
      loadChallenges(); // Refresh to get updated phases
      setIsPhaseDialogOpen(false);
      resetPhaseForm();
      toast({
        title: "Success",
        description: "Phase created successfully!",
      });
    } catch (error) {
      console.error('Error creating phase:', error);
      toast({
        title: "Error",
        description: "Failed to create phase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPhase = (phase: ChallengePhase) => {
    setEditingPhase(phase);
    setSelectedChallengeId(phase.challenge);
    setPhaseFormData({
      challenge: phase.challenge,
      phase_type: phase.phase_type,
      trading_period: phase.trading_period,
      min_trading_days: phase.min_trading_days,
      max_daily_loss: Number(phase.max_daily_loss),
      max_loss: Number(phase.max_loss),
      profit_target: phase.profit_target ? Number(phase.profit_target) : null,
    });
    setIsPhaseDialogOpen(true);
  };

  const handleUpdatePhase = async () => {
    if (!editingPhase) return;
    
    try {
      await challengeService.updateChallengePhase(editingPhase.id, {
        ...phaseFormData,
        phase_type_display: phaseFormData.phase_type === 'phase-1' ? 'Phase 1' : phaseFormData.phase_type === 'phase-2' ? 'Phase 2' : 'Live Trader',
        max_daily_loss: phaseFormData.max_daily_loss.toString(),
        max_loss: phaseFormData.max_loss.toString(),
        profit_target: phaseFormData.profit_target ? phaseFormData.profit_target.toString() : null,
        min_trading_days: phaseFormData.min_trading_days.toString()
      });
      loadChallenges(); // Refresh to get updated phases
      setIsPhaseDialogOpen(false);
      setEditingPhase(null);
      resetPhaseForm();
      toast({
        title: "Success",
        description: "Phase updated successfully!",
      });
    } catch (error) {
      console.error('Error updating phase:', error);
      toast({
        title: "Error",
        description: "Failed to update phase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePhase = async (phaseId: number) => {
    if (!confirm("Are you sure you want to delete this phase?")) return;
    
    try {
      await challengeService.deleteChallengePhase(phaseId);
      loadChallenges(); // Refresh to get updated phases
      toast({
        title: "Success",
        description: "Phase deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting phase:', error);
      toast({
        title: "Error",
        description: "Failed to delete phase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetPhaseForm = () => {
    setPhaseFormData({
      challenge: 0,
      phase_type: 'phase-1',
      trading_period: 'Unlimited',
      min_trading_days: '0',
      max_daily_loss: 4,
      max_loss: 8,
      profit_target: null,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Challenge Configurations
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create and manage trading challenge templates with customizable phases
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="hover-scale w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingChallenge ? "Edit Challenge" : "Create New Challenge"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Challenge Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter challenge name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="step_type">Step Type</Label>
                <Select
                  value={formData.step_type}
                  onValueChange={(value: "1-step" | "2-step") =>
                    setFormData({ ...formData, step_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select step type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-step">1 Step Challenge</SelectItem>
                    <SelectItem value="2-step">2 Step Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active Challenge</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingChallenge ? handleUpdateChallenge : handleCreateChallenge}>
                {editingChallenge ? "Update Challenge" : "Create Challenge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Phase Dialog */}
      <Dialog open={isPhaseDialogOpen} onOpenChange={(open) => {
        setIsPhaseDialogOpen(open);
        if (!open) {
          setEditingPhase(null);
          resetPhaseForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPhase ? "Edit Phase" : "Add New Phase"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phase_type">Select Phase</Label>
              <Select
                value={phaseFormData.phase_type}
                onValueChange={(value: 'phase-1' | 'phase-2' | 'live-trader') =>
                  setPhaseFormData({ ...phaseFormData, phase_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose phase type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phase-1">Phase 1</SelectItem>
                  <SelectItem value="phase-2">Phase 2</SelectItem>
                  <SelectItem value="live-trader">Live Trader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="trading_period">Trading Period</Label>
              <Input
                id="trading_period"
                value={phaseFormData.trading_period}
                onChange={(e) => setPhaseFormData({ ...phaseFormData, trading_period: e.target.value })}
                placeholder="e.g., Unlimited, 30 days"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="profit_target">Profit Target (%)</Label>
                <Input
                  id="profit_target"
                  type="number"
                  step="0.01"
                  value={phaseFormData.profit_target || ""}
                  onChange={(e) => setPhaseFormData({ 
                    ...phaseFormData, 
                    profit_target: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="8.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="min_trading_days">Min Trading Days</Label>
                <Input
                  id="min_trading_days"
                  value={phaseFormData.min_trading_days}
                  onChange={(e) => setPhaseFormData({ 
                    ...phaseFormData, 
                    min_trading_days: e.target.value 
                  })}
                  placeholder="0 or Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="max_daily_loss">Max Daily Loss (%)</Label>
                <Input
                  id="max_daily_loss"
                  type="number"
                  step="0.01"
                  value={phaseFormData.max_daily_loss}
                  onChange={(e) => setPhaseFormData({ 
                    ...phaseFormData, 
                    max_daily_loss: parseFloat(e.target.value) || 0 
                  })}
                  placeholder="4.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_loss">Max Total Loss (%)</Label>
                <Input
                  id="max_loss"
                  type="number"
                  step="0.01"
                  value={phaseFormData.max_loss}
                  onChange={(e) => setPhaseFormData({ 
                    ...phaseFormData, 
                    max_loss: parseFloat(e.target.value) || 0 
                  })}
                  placeholder="8.00"
                />
              </div>
            </div>

            {/* Note: Removed is_active switch since it's not in the Django model */}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsPhaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingPhase ? handleUpdatePhase : handleCreatePhase}>
              {editingPhase ? "Update Phase" : "Create Phase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Challenges</p>
                <p className="text-2xl font-bold">{challenges.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Challenges</p>
                <p className="text-2xl font-bold">{challenges.filter(c => c.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Phases</p>
                <p className="text-2xl font-bold">
                  {challenges.reduce((acc, c) => acc + (c.phases?.length || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Challenges Grid */}
      {challenges.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-muted/30 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No challenges configured</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first trading challenge template to get started. You can define phases, profit targets, and risk parameters.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Challenge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onEdit={openEditDialog}
              onDelete={handleDeleteChallenge}
              onAddPhase={handleAddPhase}
              onEditPhase={handleEditPhase}
              onDeletePhase={handleDeletePhase}
              onRefresh={loadChallenges}
            />
          ))}
        </div>
      )}
    </div>
  );
}