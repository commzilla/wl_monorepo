import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Settings } from 'lucide-react';
import { AccountByIP, IPAnalyticsPagination } from '@/lib/types/ipAnalysis';
import { useNavigate } from 'react-router-dom';

interface IPAccountsTableProps {
  ip: string;
  data: AccountByIP[];
  pagination: IPAnalyticsPagination;
  onPageChange: (page: number) => void;
  onBack: () => void;
  loading?: boolean;
}

export const IPAccountsTable: React.FC<IPAccountsTableProps> = ({
  ip,
  data,
  pagination,
  onPageChange,
  onBack,
  loading = false
}) => {
  const [currentPage, setCurrentPage] = useState(pagination.page);
  const navigate = useNavigate();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange(page);
  };

  const getVisiblePages = () => {
    const totalPages = pagination.totalPages;
    const current = currentPage;
    const delta = 2;
    const range = [];

    for (
      let i = Math.max(2, current - delta);
      i <= Math.min(totalPages - 1, current + delta);
      i++
    ) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift('...');
    }
    if (current + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const handleViewEnrollment = (enrollmentId: string) => {
    navigate(`/enrollment-review/${enrollmentId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if the date is invalid (which might happen with Unix timestamps in seconds)
      if (isNaN(date.getTime()) || date.getFullYear() < 1980) {
        // Try parsing as Unix timestamp in seconds
        const timestamp = parseInt(dateString);
        if (!isNaN(timestamp)) {
          // Convert seconds to milliseconds if it's a Unix timestamp
          const timestampMs = timestamp < 1e10 ? timestamp * 1000 : timestamp;
          const newDate = new Date(timestampMs);
          if (!isNaN(newDate.getTime()) && newDate.getFullYear() >= 1980) {
            return newDate.toLocaleDateString();
          }
        }
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to IP Summary
            </Button>
            <CardTitle>Accounts for IP: {ip}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading accounts...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to IP Summary
            </Button>
            <CardTitle>Accounts for IP: {ip}</CardTitle>
          </div>
          <Badge variant="secondary">
            {pagination.total} accounts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Login</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No accounts found for this IP
                  </TableCell>
                </TableRow>
              ) : (
                data.map((account) => (
                  <TableRow key={account.login} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-semibold">
                      {account.login}
                    </TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {account.group}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${account.balance.toLocaleString('en-US', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {account.city && account.country 
                        ? `${account.city}, ${account.country}`
                        : account.country || '-'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(account.created)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {account.enrollment_id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEnrollment(account.enrollment_id!)}
                              className="h-8 w-8 p-0"
                              title="View Enrollment"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEnrollment(account.enrollment_id!)}
                              className="h-8 px-2"
                              title="Manager"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              <span className="text-xs">Manager</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {getVisiblePages().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => handlePageChange(page as number)}
                        isActive={page === currentPage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(pagination.totalPages, currentPage + 1))}
                    className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};