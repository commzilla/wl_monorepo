
export type ChallengeStep = '1-step' | '2-step' | 'live';
export type ChallengeStatus = 'phase-1-in-progress' | 'phase-2-in-progress' | 'passed-phase-1' | 'passed-phase-2' | 'failed';
export type AccountStatus = 'active' | 'breached' | 'closed';
export type KycVerificationStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'not_submitted';

export interface TraderAccount {
  id: string;
  traderId: string;
  accountId: string;
  balance: number;
  equity: number;
  platform: string;
  step: ChallengeStep;
  status: AccountStatus;
  createdAt: Date;
}

export interface TraderChallenge {
  id: string;
  traderId: string;
  step: ChallengeStep;
  startDate: Date;
  endDate?: Date;
  status: ChallengeStatus;
  accountId?: string;
  initialBalance: number;
  currentBalance?: number;
  targetProfit: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
  daysRemaining: number;
}

export interface KycVerification {
  id: string;
  traderId: string;
  sessionId: string;
  requestedAt: Date;
  completedAt?: Date;
  status: KycVerificationStatus;
  verificationUrl?: string;
  notes?: string;
}

export interface Trader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  registeredAt: Date;
  challenges: TraderChallenge[];
  accounts: TraderAccount[];
  kycVerifications?: KycVerification[];
}

// Temporary mock service until we connect to the backend
export class TraderService {
  private static traders: Trader[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      country: 'United States',
      kycStatus: 'approved',
      registeredAt: new Date('2025-04-15'),
      challenges: [
        {
          id: 'c1',
          traderId: '1',
          step: '1-step',
          startDate: new Date('2025-04-20'),
          endDate: new Date('2025-05-10'),
          status: 'passed-phase-1',
          accountId: 'a1',
          initialBalance: 10000,
          currentBalance: 12500,
          targetProfit: 1000,
          maxDailyLoss: 500,
          maxTotalLoss: 1000,
          daysRemaining: 0,
        },
        {
          id: 'c2',
          traderId: '1',
          step: '2-step',
          startDate: new Date('2025-05-15'),
          status: 'phase-2-in-progress', // Changed from 'active'
          accountId: 'a2',
          initialBalance: 25000,
          currentBalance: 27300,
          targetProfit: 2500,
          maxDailyLoss: 1250,
          maxTotalLoss: 2500,
          daysRemaining: 10,
        }
      ],
      accounts: [
        {
          id: 'a1',
          traderId: '1',
          accountId: 'MT5-10001',
          balance: 12500,
          equity: 12700,
          platform: 'MT5',
          step: '1-step',
          status: 'closed',
          createdAt: new Date('2025-04-20'),
        },
        {
          id: 'a2',
          traderId: '1',
          accountId: 'MT5-20001',
          balance: 27300,
          equity: 27400,
          platform: 'MT5',
          step: '2-step',
          status: 'active',
          createdAt: new Date('2025-05-15'),
        }
      ],
      kycVerifications: [
        {
          id: 'k1',
          traderId: '1',
          sessionId: 'veriff-session-123',
          requestedAt: new Date('2025-05-02'),
          completedAt: new Date('2025-05-03'),
          status: 'approved',
          verificationUrl: 'https://veriff.com/sessions/123',
          notes: 'All documents valid.'
        }
      ]
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      country: 'United Kingdom',
      kycStatus: 'pending',
      registeredAt: new Date('2025-05-10'),
      challenges: [
        {
          id: 'c3',
          traderId: '2',
          step: '1-step',
          startDate: new Date('2025-05-15'),
          status: 'phase-1-in-progress', // Changed from 'active'
          accountId: 'a3',
          initialBalance: 50000,
          currentBalance: 48000,
          targetProfit: 5000,
          maxDailyLoss: 2500,
          maxTotalLoss: 5000,
          daysRemaining: 5,
        }
      ],
      accounts: [
        {
          id: 'a3',
          traderId: '2',
          accountId: 'MT5-30001',
          balance: 48000,
          equity: 48200,
          platform: 'MT5',
          step: '1-step',
          status: 'active',
          createdAt: new Date('2025-05-15'),
        }
      ],
      kycVerifications: [
        {
          id: 'k2',
          traderId: '2',
          sessionId: 'veriff-session-456',
          requestedAt: new Date('2025-05-15'),
          status: 'in_progress',
          verificationUrl: 'https://veriff.com/sessions/456',
        }
      ]
    }
  ];

  // Add a new mock trader with KYC verification in progress
  static {
    this.traders.push({
      id: '3',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael@example.com',
      country: 'Canada',
      kycStatus: 'pending',
      registeredAt: new Date('2025-03-05'),
      challenges: [
        {
          id: 'c4',
          traderId: '3',
          step: '2-step',
          startDate: new Date('2025-04-10'),
          endDate: new Date('2025-05-10'),
          status: 'passed-phase-2',
          accountId: 'a4',
          initialBalance: 100000,
          currentBalance: 115000,
          targetProfit: 10000,
          maxDailyLoss: 5000,
          maxTotalLoss: 10000,
          daysRemaining: 0,
        }
      ],
      accounts: [
        {
          id: 'a4',
          traderId: '3',
          accountId: 'MT5-40001',
          balance: 115000,
          equity: 115200,
          platform: 'MT5',
          step: '2-step',
          status: 'closed',
          createdAt: new Date('2025-04-10'),
        }
      ],
      kycVerifications: [
        {
          id: 'k3',
          traderId: '3',
          sessionId: 'veriff-session-789',
          requestedAt: new Date('2025-05-12'),
          status: 'pending',
          verificationUrl: 'https://veriff.com/sessions/789',
          notes: 'Waiting for trader to complete verification'
        }
      ]
    });

    this.traders.push({
      id: '4',
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah@example.com',
      country: 'Australia',
      kycStatus: 'rejected',
      registeredAt: new Date('2025-04-28'),
      challenges: [
        {
          id: 'c5',
          traderId: '4',
          step: '1-step',
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-05-18'),
          status: 'passed-phase-1',
          accountId: 'a5',
          initialBalance: 25000,
          currentBalance: 28500,
          targetProfit: 2500,
          maxDailyLoss: 1250,
          maxTotalLoss: 2500,
          daysRemaining: 0,
        }
      ],
      accounts: [
        {
          id: 'a5',
          traderId: '4',
          accountId: 'MT5-50001',
          balance: 28500,
          equity: 28500,
          platform: 'MT5',
          step: '1-step',
          status: 'closed',
          createdAt: new Date('2025-05-01'),
        }
      ],
      kycVerifications: [
        {
          id: 'k4',
          traderId: '4',
          sessionId: 'veriff-session-abc',
          requestedAt: new Date('2025-05-19'),
          completedAt: new Date('2025-05-20'),
          status: 'rejected',
          verificationUrl: 'https://veriff.com/sessions/abc',
          notes: 'ID document expired. Please resubmit with valid documentation.'
        }
      ]
    });
  }

  static getTraders(): Trader[] {
    return this.traders;
  }

  static getTraderById(id: string): Trader | undefined {
    return this.traders.find(t => t.id === id);
  }

  static addTrader(trader: Trader): void {
    this.traders.push(trader);
  }

  static getChallenges(): TraderChallenge[] {
    return this.traders.flatMap(t => t.challenges);
  }

  static getAccounts(): TraderAccount[] {
    return this.traders.flatMap(t => t.accounts);
  }

  static getKycVerifications(): KycVerification[] {
    return this.traders.flatMap(t => t.kycVerifications || []);
  }

  static requestKycVerification(traderId: string): KycVerification {
    const trader = this.getTraderById(traderId);
    if (!trader) {
      throw new Error(`Trader with ID ${traderId} not found`);
    }

    // In a real implementation, this would call the Veriff API to create a session
    const kycVerification: KycVerification = {
      id: `k${Date.now()}`,
      traderId: traderId,
      sessionId: `veriff-session-${Date.now()}`,
      requestedAt: new Date(),
      status: 'pending',
      verificationUrl: `https://veriff.com/sessions/${Date.now()}`,
      notes: 'KYC verification requested'
    };

    if (!trader.kycVerifications) {
      trader.kycVerifications = [];
    }
    trader.kycVerifications.push(kycVerification);
    trader.kycStatus = 'pending';

    return kycVerification;
  }

  static updateKycVerificationStatus(id: string, status: KycVerificationStatus, notes?: string): KycVerification | undefined {
    for (const trader of this.traders) {
      if (!trader.kycVerifications) continue;
      
      const kycVerification = trader.kycVerifications.find(kyc => kyc.id === id);
      if (kycVerification) {
        kycVerification.status = status;
        if (notes) kycVerification.notes = notes;
        
        if (status === 'approved' || status === 'rejected') {
          kycVerification.completedAt = new Date();
          trader.kycStatus = status;
        }
        
        return kycVerification;
      }
    }
    
    return undefined;
  }
}
