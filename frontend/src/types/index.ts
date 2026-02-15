export type UserRole = 'voter' | 'host' | 'admin';
export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  plan: UserPlan;
  isVerified: boolean;
  pollsCreated: number;
}

export type PollStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'closed' | 'archived';
export type AccessType = 'public' | 'token' | 'invite' | 'code' | 'account' | 'link';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'ranked_choice' | 'rating' | 'open_text' | 'yes_no';
export type ResultVisibilityMode = 'real_time' | 'on_close' | 'host_release' | 'hidden' | 'delayed';
export type PollCategory = 'general' | 'governance' | 'community' | 'event' | 'competition' | 'award' | 'survey' | 'dao' | 'other';

export interface PollOption {
  id: string;
  text: string;
  description?: string;
  imageUrl?: string;
  voteCount: number;
  order: number;
}

export interface PollQuestion {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  required: boolean;
  options: PollOption[];
  settings: {
    maxChoices?: number;
    minChoices?: number;
    maxRating?: number;
    allowAbstain?: boolean;
  };
  order: number;
}

export interface Eligibility {
  type: AccessType;
  accessCode?: string;
  invitedEmails?: string[];
  tokenCount?: number;
  requireVerifiedEmail?: boolean;
  allowAnonymous?: boolean;
  maxVoters?: number | null;
}

export interface ResultVisibility {
  mode: ResultVisibilityMode;
  showAfterMinutes?: number;
  showVoterNames?: boolean;
  showPercentages?: boolean;
  showAbsoluteNumbers?: boolean;
  released?: boolean;
  releasedAt?: string;
}

export interface PollSettings {
  allowComments?: boolean;
  allowVoteChange?: boolean;
  shuffleOptions?: boolean;
  showProgressBar?: boolean;
  requireAllQuestions?: boolean;
  sendEmailNotifications?: boolean;
  captchaEnabled?: boolean;
  ipDeduplication?: boolean;
}

export interface PollStats {
  totalVotes: number;
  uniqueVoters?: number;
  completionRate?: number;
  lastVoteAt?: string;
}

export interface Poll {
  _id: string;
  slug: string;
  shortId: string;
  host: User | string;
  title: string;
  description?: string;
  coverImage?: string;
  tags: string[];
  category: PollCategory;
  questions: PollQuestion[];
  status: PollStatus;
  startsAt?: string;
  endsAt?: string;
  timezone: string;
  accessType: AccessType;
  eligibility: Eligibility;
  resultVisibility: ResultVisibility;
  settings: PollSettings;
  stats: PollStats;
  isPublished: boolean;
  isFeatured: boolean;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoteAnswer {
  questionId: string;
  questionType: QuestionType;
  selectedOptions?: string[];
  rankedOptions?: string[];
  rating?: number;
  textResponse?: string;
  booleanResponse?: boolean;
}

export interface SubmitVotePayload {
  pollSlug?: string;
  pollId?: string;
  answers: VoteAnswer[];
  accessToken?: string;
  accessCode?: string;
  sessionId?: string;
  completionTimeSeconds?: number;
}

export interface QuestionResult {
  id: string;
  text: string;
  type: QuestionType;
  totalResponses: number;
  options: {
    id: string;
    text: string;
    voteCount: number;
    percentage: number;
  }[];
}

export interface PollResults {
  pollTitle: string;
  status: PollStatus;
  stats: PollStats;
  questions: QuestionResult[];
  resultVisibility: ResultVisibility;
}

export interface DashboardOverview {
  totalPolls: number;
  activePolls: number;
  closedPolls: number;
  draftPolls: number;
  totalVotes: number;
  recentPolls: number;
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface CreatePollPayload {
  title: string;
  description?: string;
  questions: Partial<PollQuestion>[];
  accessType: AccessType;
  eligibility: Partial<Eligibility>;
  resultVisibility: Partial<ResultVisibility>;
  settings?: Partial<PollSettings>;
  startsAt?: string;
  endsAt?: string;
  category: PollCategory;
  tags?: string[];
  status?: PollStatus;
}
