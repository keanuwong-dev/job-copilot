import type { AppStatus } from './status';
import { APP_STATUSES } from './status';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profile: {
        Row: {
          user_id: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          company_domain: string | null;
          role: string;
          job_url: string | null;
          platform: string | null;
          location: string | null;
          status: AppStatus;
          applied_at: string | null;
          last_activity_at: string;
          salary_range: string | null;
          notes: string | null;
          tier: 'reach' | 'target' | 'volume' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company: string;
          company_domain?: string | null;
          role: string;
          job_url?: string | null;
          platform?: string | null;
          location?: string | null;
          status?: AppStatus;
          applied_at?: string | null;
          last_activity_at?: string;
          salary_range?: string | null;
          notes?: string | null;
          tier?: 'reach' | 'target' | 'volume' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company?: string;
          company_domain?: string | null;
          role?: string;
          job_url?: string | null;
          platform?: string | null;
          location?: string | null;
          status?: AppStatus;
          applied_at?: string | null;
          last_activity_at?: string;
          salary_range?: string | null;
          notes?: string | null;
          tier?: 'reach' | 'target' | 'volume' | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'applications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      email_events: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          gmail_message_id: string;
          from_address: string | null;
          subject: string | null;
          snippet: string | null;
          detected_status: AppStatus | null;
          confidence: number | null;
          received_at: string | null;
          reviewed: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          gmail_message_id: string;
          from_address?: string | null;
          subject?: string | null;
          snippet?: string | null;
          detected_status?: AppStatus | null;
          confidence?: number | null;
          received_at?: string | null;
          reviewed?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string | null;
          gmail_message_id?: string;
          from_address?: string | null;
          subject?: string | null;
          snippet?: string | null;
          detected_status?: AppStatus | null;
          confidence?: number | null;
          received_at?: string | null;
          reviewed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'email_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_events_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      answer_bank: {
        Row: {
          id: string;
          user_id: string;
          question_normalized: string;
          question_raw: string | null;
          answer: string;
          platform: string | null;
          times_used: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_normalized: string;
          question_raw?: string | null;
          answer: string;
          platform?: string | null;
          times_used?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_normalized?: string;
          question_raw?: string | null;
          answer?: string;
          platform?: string | null;
          times_used?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'answer_bank_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_hash: string;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_hash: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_hash?: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'api_keys_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_status: AppStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type ColumnMeta = {
  nullable: boolean;
  hasDefault: boolean;
  udt: string;
};

/** Column contract checked against the applied migration. */
export const TABLE_COLUMNS = {
  profile: {
    user_id: { nullable: false, hasDefault: false, udt: 'uuid' },
    data: { nullable: false, hasDefault: false, udt: 'jsonb' },
    updated_at: { nullable: false, hasDefault: true, udt: 'timestamptz' },
  },
  applications: {
    id: { nullable: false, hasDefault: true, udt: 'uuid' },
    user_id: { nullable: false, hasDefault: false, udt: 'uuid' },
    company: { nullable: false, hasDefault: false, udt: 'text' },
    company_domain: { nullable: true, hasDefault: false, udt: 'text' },
    role: { nullable: false, hasDefault: false, udt: 'text' },
    job_url: { nullable: true, hasDefault: false, udt: 'text' },
    platform: { nullable: true, hasDefault: false, udt: 'text' },
    location: { nullable: true, hasDefault: false, udt: 'text' },
    status: { nullable: false, hasDefault: true, udt: 'app_status' },
    applied_at: { nullable: true, hasDefault: false, udt: 'timestamptz' },
    last_activity_at: { nullable: false, hasDefault: true, udt: 'timestamptz' },
    salary_range: { nullable: true, hasDefault: false, udt: 'text' },
    notes: { nullable: true, hasDefault: false, udt: 'text' },
    tier: { nullable: true, hasDefault: false, udt: 'text' },
    created_at: { nullable: false, hasDefault: true, udt: 'timestamptz' },
  },
  email_events: {
    id: { nullable: false, hasDefault: true, udt: 'uuid' },
    user_id: { nullable: false, hasDefault: false, udt: 'uuid' },
    application_id: { nullable: true, hasDefault: false, udt: 'uuid' },
    gmail_message_id: { nullable: false, hasDefault: false, udt: 'text' },
    from_address: { nullable: true, hasDefault: false, udt: 'text' },
    subject: { nullable: true, hasDefault: false, udt: 'text' },
    snippet: { nullable: true, hasDefault: false, udt: 'text' },
    detected_status: { nullable: true, hasDefault: false, udt: 'app_status' },
    confidence: { nullable: true, hasDefault: false, udt: 'float4' },
    received_at: { nullable: true, hasDefault: false, udt: 'timestamptz' },
    reviewed: { nullable: false, hasDefault: true, udt: 'bool' },
  },
  answer_bank: {
    id: { nullable: false, hasDefault: true, udt: 'uuid' },
    user_id: { nullable: false, hasDefault: false, udt: 'uuid' },
    question_normalized: { nullable: false, hasDefault: false, udt: 'text' },
    question_raw: { nullable: true, hasDefault: false, udt: 'text' },
    answer: { nullable: false, hasDefault: false, udt: 'text' },
    platform: { nullable: true, hasDefault: false, udt: 'text' },
    times_used: { nullable: false, hasDefault: true, udt: 'int4' },
    updated_at: { nullable: false, hasDefault: true, udt: 'timestamptz' },
  },
  api_keys: {
    id: { nullable: false, hasDefault: true, udt: 'uuid' },
    user_id: { nullable: false, hasDefault: false, udt: 'uuid' },
    name: { nullable: false, hasDefault: false, udt: 'text' },
    key_hash: { nullable: false, hasDefault: false, udt: 'text' },
    created_at: { nullable: false, hasDefault: true, udt: 'timestamptz' },
    last_used_at: { nullable: true, hasDefault: false, udt: 'timestamptz' },
  },
} as const satisfies Record<keyof Database['public']['Tables'], Record<string, ColumnMeta>>;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type TableName = keyof Database['public']['Tables'];

export const schemaChecks = {
  status: true satisfies Equal<Database['public']['Enums']['app_status'], AppStatus>,
  statusValues: true satisfies Equal<
    (typeof APP_STATUSES)[number],
    Database['public']['Enums']['app_status']
  >,
  profile: true satisfies Equal<
    keyof Database['public']['Tables']['profile']['Row'],
    keyof (typeof TABLE_COLUMNS)['profile']
  >,
  applications: true satisfies Equal<
    keyof Database['public']['Tables']['applications']['Row'],
    keyof (typeof TABLE_COLUMNS)['applications']
  >,
  email_events: true satisfies Equal<
    keyof Database['public']['Tables']['email_events']['Row'],
    keyof (typeof TABLE_COLUMNS)['email_events']
  >,
  answer_bank: true satisfies Equal<
    keyof Database['public']['Tables']['answer_bank']['Row'],
    keyof (typeof TABLE_COLUMNS)['answer_bank']
  >,
  api_keys: true satisfies Equal<
    keyof Database['public']['Tables']['api_keys']['Row'],
    keyof (typeof TABLE_COLUMNS)['api_keys']
  >,
  tables: true satisfies Equal<TableName, keyof typeof TABLE_COLUMNS>,
};
