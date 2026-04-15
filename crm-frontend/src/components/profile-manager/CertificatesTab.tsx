import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Plus, ExternalLink, Download, ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import GenerateCertificateDialog from '@/components/certificates/GenerateCertificateDialog';
import CertificateDialog from '@/components/certificates/CertificateDialog';

interface CertificatesTabProps {
  certificates: any[];
  certificatesByChallenge?: Array<{
    challenge_name: string;
    account_size: number;
    mt5_account_id: string;
    certificates: any[];
  }> | null;
  challenges?: any[];
  userEmail?: string;
  userName?: string;
}

interface GroupedCertificates {
  key: string;
  challengeName: string;
  accountSize: string | null;
  mt5AccountId: string | null;
  certificates: any[];
}

export default function CertificatesTab({ certificates, certificatesByChallenge, challenges = [], userEmail, userName }: CertificatesTabProps) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCert, setDeletingCert] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedCerts, setExpandedCerts] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(`/certificates2/${id}/`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trader-profile'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({ title: 'Success', description: 'Certificate deleted successfully' });
      setDeleteOpen(false);
      setDeletingCert(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to delete certificate: ${error.message}`, variant: 'destructive' });
    },
  });

  // Build a lookup map from challenges data
  const challengeMap = useMemo(() => {
    const map: Record<string, any> = {};
    challenges.forEach((ch: any) => {
      if (ch.id) map[ch.id] = ch;
      if (ch.enrollment_id) map[ch.enrollment_id] = ch;
    });
    return map;
  }, [challenges]);

  const groupedCerts = useMemo(() => {
    // Use pre-grouped data from API when available
    if (certificatesByChallenge && certificatesByChallenge.length > 0) {
      return certificatesByChallenge.map((group) => ({
        key: group.mt5_account_id || group.challenge_name,
        challengeName: group.challenge_name,
        accountSize: group.account_size ? String(group.account_size) : null,
        mt5AccountId: group.mt5_account_id || null,
        certificates: group.certificates,
      }));
    }

    // Fallback: client-side grouping
    const groups: Record<string, GroupedCertificates> = {};

    certificates.forEach((cert: any) => {
      const meta = cert.metadata || {};
      const key = cert.challenge_enrollment || cert.enrollment_id || cert.enrollment || meta.enrollment_id || meta.challenge_enrollment || meta.enrollment || cert.account_id || cert.mt5_account_id || 'unknown';

      const matched = challengeMap[key];

      if (!groups[key]) {
        groups[key] = {
          key,
          challengeName: matched?.challenge_name || matched?.name || cert.challenge_name || meta.challenge_name || `Account ${key !== 'unknown' ? key.toString().slice(0, 8) : 'Unknown'}`,
          accountSize: matched?.account_size || matched?.initial_balance || meta.account_size || null,
          mt5AccountId: matched?.mt5_account_id || cert.mt5_account_id || meta.mt5_account_id || meta.mt5_id || null,
          certificates: [],
        };
      }
      groups[key].certificates.push(cert);
    });

    return Object.values(groups);
  }, [certificates, certificatesByChallenge, challengeMap]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEdit = (cert: any) => {
    setEditingCert(cert);
    setEditOpen(true);
  };

  const handleDelete = (cert: any) => {
    setDeletingCert(cert);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deletingCert?.id) {
      deleteMutation.mutate(deletingCert.id);
    }
  };

  const toggleCert = (id: string) => {
    setExpandedCerts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCertCard = (cert: any, index: number) => {
    const certId = cert.id || `cert-${index}`;
    const isOpen = expandedCerts.has(certId);

    return (
      <div key={certId} className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {/* Collapsed header - always visible */}
        <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
          <button
            onClick={() => toggleCert(certId)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm">{cert.title || 'Certificate'}</h3>
                <Badge variant="default" className="text-xs">
                  {cert.certificate_type === 'phase_pass' ? 'Phase Passed' :
                   cert.certificate_type === 'live_account' ? 'Live Account' :
                   cert.certificate_type || 'Active'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cert.issued_date ? new Date(cert.issued_date).toLocaleDateString() : 'N/A'}
                {cert.expiry_date && (
                  <span className={new Date(cert.expiry_date) < new Date() ? 'text-destructive ml-2' : ' ml-2'}>
                    · Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cert)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cert)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isOpen && (
          <div className="border-t border-border/40 p-5 space-y-4">
            <p className="text-xs text-muted-foreground font-mono">{cert.id}</p>

            {cert.image_url && (
              <div className="rounded-lg overflow-hidden border border-border/40 max-w-sm">
                <img
                  src={cert.image_url}
                  alt={cert.title || 'Certificate'}
                  className="w-full h-auto"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {cert.image_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={cert.image_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download Image
                  </a>
                </Button>
              )}
              {cert.pdf_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={cert.pdf_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download PDF
                  </a>
                </Button>
              )}
            </div>

            {cert.metadata && Object.keys(cert.metadata).length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Additional Info</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {Object.entries(cert.metadata).map(([key, value]: [string, any], i: number) => (
                    <div key={i}>
                      <span className="text-muted-foreground capitalize text-xs">{key.replace('_', ' ')}:</span>
                      <span className="ml-1 text-xs font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const showFlat = groupedCerts.length === 1 && groupedCerts[0].key === 'unknown';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{certificates.length} certificates</span>
        <Button size="sm" onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Generate Certificate
        </Button>
      </div>

      {certificates.length > 0 ? (
        showFlat ? (
          <div className="space-y-3">
            {certificates.map((cert: any, index: number) => renderCertCard(cert, index))}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedCerts.map((group) => {
              const isExpanded = expandedGroups.has(group.key);
              return (
                <div key={group.key} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{group.challengeName}</p>
                          {group.accountSize && (
                            <Badge variant="secondary" className="text-xs">
                              ${Number(group.accountSize).toLocaleString()}
                            </Badge>
                          )}
                          {group.mt5AccountId && (
                            <Badge variant="outline" className="text-xs font-mono">
                              MT5: {group.mt5AccountId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.certificates.length} certificate{group.certificates.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {group.certificates.length}
                    </Badge>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/40 p-3 space-y-3">
                      {group.certificates.map((cert: any, index: number) => renderCertCard(cert, index))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <Award className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No certificates found</p>
        </div>
      )}

      {/* Generate Certificate Dialog */}
      <GenerateCertificateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        defaultClientEmail={userEmail}
        defaultClientName={userName}
      />

      {/* Edit Certificate Dialog */}
      <CertificateDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingCert(null);
        }}
        certificate={editingCert}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this certificate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingCert && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-medium">{deletingCert.title || 'Certificate'}</p>
              <p className="text-xs text-muted-foreground font-mono">{deletingCert.id}</p>
              <p className="text-xs text-muted-foreground">
                Type: {deletingCert.certificate_type === 'phase_pass' ? 'Phase Pass' : deletingCert.certificate_type || 'Unknown'}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCert(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
