export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ExerciseSnapshot = {
  title: string
  description: string | null
  duration_seconds: number | null
  sets: number | null
  reps: number | null
  order_index: number
  body_area: string | null
  thumbnail_url: string | null
  video_url: string | null
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accountability_pairs: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          partner_id: string
          shared_streak: number | null
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          partner_id: string
          shared_streak?: number | null
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          shared_streak?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      achievement_progress: {
        Row: {
          badge_id: string | null
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          is_completed: boolean
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_goals: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          weekly_activities: number | null
          weekly_calories: number | null
          weekly_distance_km: number | null
          weekly_duration_minutes: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          weekly_activities?: number | null
          weekly_calories?: number | null
          weekly_distance_km?: number | null
          weekly_duration_minutes?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          weekly_activities?: number | null
          weekly_calories?: number | null
          weekly_distance_km?: number | null
          weekly_duration_minutes?: number | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          activity_type: string
          avg_heart_rate: number | null
          calories_burned: number | null
          created_at: string
          distance_km: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          intensity_level: number | null
          notes: string | null
          route_data: Json | null
          route_end_address: string | null
          route_start_address: string | null
          score_impact: number | null
          started_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          avg_heart_rate?: number | null
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          intensity_level?: number | null
          notes?: string | null
          route_data?: Json | null
          route_end_address?: string | null
          route_start_address?: string | null
          score_impact?: number | null
          started_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          avg_heart_rate?: number | null
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          intensity_level?: number | null
          notes?: string | null
          route_data?: Json | null
          route_end_address?: string | null
          route_start_address?: string | null
          score_impact?: number | null
          started_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_preferences: {
        Row: {
          activity_types: string[] | null
          created_at: string
          id: string
          intensity_level: number | null
          onboarding_completed: boolean | null
          preferred_time: string | null
          typical_duration_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_types?: string[] | null
          created_at?: string
          id?: string
          intensity_level?: number | null
          onboarding_completed?: boolean | null
          preferred_time?: string | null
          typical_duration_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_types?: string[] | null
          created_at?: string
          id?: string
          intensity_level?: number | null
          onboarding_completed?: boolean | null
          preferred_time?: string | null
          typical_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_recommendations: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_calories: number | null
          id: string
          intensity: string | null
          score_reward: number | null
          status: string | null
          suggested_duration_minutes: number | null
          suggested_time: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_calories?: number | null
          id?: string
          intensity?: string | null
          score_reward?: number | null
          status?: string | null
          suggested_duration_minutes?: number | null
          suggested_time?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_calories?: number | null
          id?: string
          intensity?: string | null
          score_reward?: number | null
          status?: string | null
          suggested_duration_minutes?: number | null
          suggested_time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generation_log: {
        Row: {
          created_at: string
          error: string | null
          generation_type: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          prompt: Json
          response: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          generation_type: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          prompt: Json
          response?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          generation_type?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          prompt?: Json
          response?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          correlation_id: string
          created_at: string
          id: string
          ip_address_hash: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          correlation_id?: string
          created_at?: string
          id?: string
          ip_address_hash?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          correlation_id?: string
          created_at?: string
          id?: string
          ip_address_hash?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      challenge_enrollments: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: number
          enrolled_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: number
          enrolled_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: number
          enrolled_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description: string | null
          ends_at: string
          id: string
          is_featured: boolean | null
          reward_xp: number | null
          starts_at: string
          status: string
          target_value: number
          title: string
        }
        Insert: {
          challenge_type?: string
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_featured?: boolean | null
          reward_xp?: number | null
          starts_at?: string
          status?: string
          target_value?: number
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_featured?: boolean | null
          reward_xp?: number | null
          starts_at?: string
          status?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      chatroom_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          id: string
          is_pinned: boolean
          media_url: string | null
          message_type: string
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_pinned?: boolean
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_pinned?: boolean
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatroom_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chatroom_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_availability: {
        Row: {
          coach_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_reviews: {
        Row: {
          coach_id: string
          created_at: string
          experience_emoji: string | null
          id: string
          is_verified: boolean | null
          rating: number
          review_text: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          experience_emoji?: string | null
          id?: string
          is_verified?: boolean | null
          rating: number
          review_text?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          experience_emoji?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number
          review_text?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          available_days: string[] | null
          available_hours_end: string | null
          available_hours_start: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          coaching_types: string[] | null
          created_at: string
          experience_years: number | null
          gallery_urls: string[] | null
          gender: string | null
          id: string
          is_available: boolean | null
          is_featured: boolean | null
          languages: string[] | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          name: string
          price_per_session_max: number | null
          price_per_session_min: number | null
          rating: number | null
          review_count: number | null
          session_count: number | null
          specialties: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          available_days?: string[] | null
          available_hours_end?: string | null
          available_hours_start?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          coaching_types?: string[] | null
          created_at?: string
          experience_years?: number | null
          gallery_urls?: string[] | null
          gender?: string | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          languages?: string[] | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          price_per_session_max?: number | null
          price_per_session_min?: number | null
          rating?: number | null
          review_count?: number | null
          session_count?: number | null
          specialties?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          available_days?: string[] | null
          available_hours_end?: string | null
          available_hours_start?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          coaching_types?: string[] | null
          created_at?: string
          experience_years?: number | null
          gallery_urls?: string[] | null
          gender?: string | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          languages?: string[] | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          price_per_session_max?: number | null
          price_per_session_min?: number | null
          rating?: number | null
          review_count?: number | null
          session_count?: number | null
          specialties?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_preferences: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          coaching_type: string | null
          created_at: string
          exercise_frequency: string | null
          id: string
          onboarding_completed: boolean | null
          preferred_coach_gender: string | null
          preferred_workout_types: string[] | null
          session_duration_minutes: number | null
          supplements: string[] | null
          target_body_areas: string[] | null
          updated_at: string
          user_id: string
          workout_time_preference: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          coaching_type?: string | null
          created_at?: string
          exercise_frequency?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_coach_gender?: string | null
          preferred_workout_types?: string[] | null
          session_duration_minutes?: number | null
          supplements?: string[] | null
          target_body_areas?: string[] | null
          updated_at?: string
          user_id: string
          workout_time_preference?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          coaching_type?: string | null
          created_at?: string
          exercise_frequency?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_coach_gender?: string | null
          preferred_workout_types?: string[] | null
          session_duration_minutes?: number | null
          supplements?: string[] | null
          target_body_areas?: string[] | null
          updated_at?: string
          user_id?: string
          workout_time_preference?: string | null
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          coach_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          price: number
          scheduled_date: string
          scheduled_time: string
          session_type: string
          status: string
          updated_at: string
          user_email: string | null
          user_full_name: string | null
          user_id: string
          user_phone: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coach_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          price: number
          scheduled_date: string
          scheduled_time: string
          session_type?: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_full_name?: string | null
          user_id: string
          user_phone?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coach_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          price?: number
          scheduled_date?: string
          scheduled_time?: string
          session_type?: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_full_name?: string | null
          user_id?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number | null
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      community_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      community_likes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "community_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          post_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          category: string
          comments_count: number | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number | null
          poll_options: Json | null
          post_type: string
          tags: string[] | null
          updated_at: string
          user_id: string
          workout_data: Json | null
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          poll_options?: Json | null
          post_type?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workout_data?: Json | null
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          poll_options?: Json | null
          post_type?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workout_data?: Json | null
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          is_private: boolean | null
          likes_received: number | null
          onboarding_completed: boolean | null
          posts_count: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_private?: boolean | null
          likes_received?: number | null
          onboarding_completed?: boolean | null
          posts_count?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_private?: boolean | null
          likes_received?: number | null
          onboarding_completed?: boolean | null
          posts_count?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_stories: {
        Row: {
          background_color: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string | null
          story_type: string
          text_content: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          story_type?: string
          text_content?: string | null
          user_id: string
        }
        Update: {
          background_color?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          story_type?: string
          text_content?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "community_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          id: string
          mood: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          mood: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          mood?: string
          user_id?: string
        }
        Relationships: []
      }
      data_access_logs: {
        Row: {
          access_type: string
          accessed_record_id: string | null
          accessed_table: string
          accessor_id: string | null
          correlation_id: string
          created_at: string
          id: string
          record_count: number | null
        }
        Insert: {
          access_type: string
          accessed_record_id?: string | null
          accessed_table: string
          accessor_id?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          record_count?: number | null
        }
        Update: {
          access_type?: string
          accessed_record_id?: string | null
          accessed_table?: string
          accessor_id?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          record_count?: number | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      google_fit_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          last_synced_at: string | null
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          created_at: string
          id: string
          metric_type: string
          notes: string | null
          recorded_at: string
          secondary_value: number | null
          source_platform: string | null
          source_platform_id: string | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_type: string
          notes?: string | null
          recorded_at?: string
          secondary_value?: number | null
          source_platform?: string | null
          source_platform_id?: string | null
          unit?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_type?: string
          notes?: string | null
          recorded_at?: string
          secondary_value?: number | null
          source_platform?: string | null
          source_platform_id?: string | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      hiit_score_history: {
        Row: {
          components: Json
          computed_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          components?: Json
          computed_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          components?: Json
          computed_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      home_layout: {
        Row: {
          enabled: boolean | null
          id: string
          label: string
          section_key: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          enabled?: boolean | null
          id?: string
          label: string
          section_key: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          enabled?: boolean | null
          id?: string
          label?: string
          section_key?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leaderboard_scores: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_points: number
          rank_position: number | null
          total_points: number
          updated_at: string
          user_id: string
          weekly_points: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          monthly_points?: number
          rank_position?: number | null
          total_points?: number
          updated_at?: string
          user_id: string
          weekly_points?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_points?: number
          rank_position?: number | null
          total_points?: number
          updated_at?: string
          user_id?: string
          weekly_points?: number
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number | null
          carbs_grams: number | null
          category: string
          created_at: string
          custom_name: string | null
          fat_grams: number | null
          fiber_grams: number | null
          id: string
          image_url: string | null
          logged_at: string
          meal_id: string | null
          notes: string | null
          protein_grams: number | null
          servings: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_grams?: number | null
          category: string
          created_at?: string
          custom_name?: string | null
          fat_grams?: number | null
          fiber_grams?: number | null
          id?: string
          image_url?: string | null
          logged_at?: string
          meal_id?: string | null
          notes?: string | null
          protein_grams?: number | null
          servings?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_grams?: number | null
          category?: string
          created_at?: string
          custom_name?: string | null
          fat_grams?: number | null
          fiber_grams?: number | null
          id?: string
          image_url?: string | null
          logged_at?: string
          meal_id?: string | null
          notes?: string | null
          protein_grams?: number | null
          servings?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number | null
          carbs_grams: number | null
          category: string
          cook_time_minutes: number | null
          created_at: string
          cuisine_type: string | null
          description: string | null
          fat_grams: number | null
          fiber_grams: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          instructions: Json | null
          is_featured: boolean | null
          name: string
          prep_time_minutes: number | null
          protein_grams: number | null
          rating: number | null
          rating_count: number | null
          servings: number | null
          tags: string[] | null
        }
        Insert: {
          calories?: number | null
          carbs_grams?: number | null
          category: string
          cook_time_minutes?: number | null
          created_at?: string
          cuisine_type?: string | null
          description?: string | null
          fat_grams?: number | null
          fiber_grams?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          is_featured?: boolean | null
          name: string
          prep_time_minutes?: number | null
          protein_grams?: number | null
          rating?: number | null
          rating_count?: number | null
          servings?: number | null
          tags?: string[] | null
        }
        Update: {
          calories?: number | null
          carbs_grams?: number | null
          category?: string
          cook_time_minutes?: number | null
          created_at?: string
          cuisine_type?: string | null
          description?: string | null
          fat_grams?: number | null
          fiber_grams?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          is_featured?: boolean | null
          name?: string
          prep_time_minutes?: number | null
          protein_grams?: number | null
          rating?: number | null
          rating_count?: number | null
          servings?: number | null
          tags?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          moderator_id: string | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          coaching_updates: boolean | null
          community_notifications: boolean | null
          created_at: string | null
          id: string
          nutrition_tips: boolean | null
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
          workout_reminders: boolean | null
        }
        Insert: {
          coaching_updates?: boolean | null
          community_notifications?: boolean | null
          created_at?: string | null
          id?: string
          nutrition_tips?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          workout_reminders?: boolean | null
        }
        Update: {
          coaching_updates?: boolean | null
          community_notifications?: boolean | null
          created_at?: string | null
          id?: string
          nutrition_tips?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          workout_reminders?: boolean | null
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          created_at: string
          daily_calories: number | null
          daily_carbs_grams: number | null
          daily_fat_grams: number | null
          daily_protein_grams: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_calories?: number | null
          daily_carbs_grams?: number | null
          daily_fat_grams?: number | null
          daily_protein_grams?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_calories?: number | null
          daily_carbs_grams?: number | null
          daily_fat_grams?: number | null
          daily_protein_grams?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_profiles: {
        Row: {
          allergies: string[] | null
          created_at: string
          daily_calorie_target: number | null
          food_preferences: string[] | null
          id: string
          notes: string | null
          onboarding_completed: boolean | null
          protein_intake: string | null
          snack_frequency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          created_at?: string
          daily_calorie_target?: number | null
          food_preferences?: string[] | null
          id?: string
          notes?: string | null
          onboarding_completed?: boolean | null
          protein_intake?: string | null
          snack_frequency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          created_at?: string
          daily_calorie_target?: number | null
          food_preferences?: string[] | null
          id?: string
          notes?: string | null
          onboarding_completed?: boolean | null
          protein_intake?: string | null
          snack_frequency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          fitness_goal: string | null
          id: string
          updated_at: string
          user_id: string
          watch_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          fitness_goal?: string | null
          id?: string
          updated_at?: string
          user_id: string
          watch_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          fitness_goal?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          watch_type?: string | null
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          body: string
          failure_count: number | null
          icon: string | null
          id: string
          sent_at: string | null
          sent_by: string | null
          success_count: number | null
          target_type: string | null
          target_value: string | null
          title: string
          topic: string | null
          url: string | null
        }
        Insert: {
          body: string
          failure_count?: number | null
          icon?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          success_count?: number | null
          target_type?: string | null
          target_value?: string | null
          title: string
          topic?: string | null
          url?: string | null
        }
        Update: {
          body?: string
          failure_count?: number | null
          icon?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          success_count?: number | null
          target_type?: string | null
          target_value?: string | null
          title?: string
          topic?: string | null
          url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          topics: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          topics?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          blocked_at: string | null
          created_at: string
          endpoint: string
          id: string
          identifier_hash: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier_hash: string
          request_count?: number | null
          window_start?: string
        }
        Update: {
          blocked_at?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier_hash?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          coordinates: Json
          created_at: string
          description: string | null
          difficulty: string
          distance_km: number | null
          elevation_gain_m: number | null
          estimated_minutes: number | null
          id: string
          is_official: boolean
          is_public: boolean
          name: string
          rating: number | null
          rating_count: number | null
          surface_type: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coordinates?: Json
          created_at?: string
          description?: string | null
          difficulty?: string
          distance_km?: number | null
          elevation_gain_m?: number | null
          estimated_minutes?: number | null
          id?: string
          is_official?: boolean
          is_public?: boolean
          name: string
          rating?: number | null
          rating_count?: number | null
          surface_type?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coordinates?: Json
          created_at?: string
          description?: string | null
          difficulty?: string
          distance_km?: number | null
          elevation_gain_m?: number | null
          estimated_minutes?: number | null
          id?: string
          is_official?: boolean
          is_public?: boolean
          name?: string
          rating?: number | null
          rating_count?: number | null
          surface_type?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_workouts: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          estimated_calories: number | null
          estimated_duration_minutes: number | null
          exercises_snapshot: ExerciseSnapshot[] | null
          id: string
          rating: number | null
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          user_id: string
          workout_description: string | null
          workout_id: string | null
          workout_source: string
          workout_title: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          estimated_calories?: number | null
          estimated_duration_minutes?: number | null
          exercises_snapshot?: ExerciseSnapshot[] | null
          id?: string
          rating?: number | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          user_id: string
          workout_description?: string | null
          workout_id?: string | null
          workout_source?: string
          workout_title?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          estimated_calories?: number | null
          estimated_duration_minutes?: number | null
          exercises_snapshot?: ExerciseSnapshot[] | null
          id?: string
          rating?: number | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          user_id?: string
          workout_description?: string | null
          workout_id?: string | null
          workout_source?: string
          workout_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          correlation_id: string
          created_at: string
          endpoint: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address_hash: string | null
          severity: string
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          correlation_id?: string
          created_at?: string
          endpoint?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address_hash?: string | null
          severity: string
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string
          endpoint?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address_hash?: string | null
          severity?: string
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          awake_minutes: number | null
          bedtime: string
          created_at: string
          deep_sleep_minutes: number | null
          duration_minutes: number | null
          id: string
          light_sleep_minutes: number | null
          notes: string | null
          rem_sleep_minutes: number | null
          score_impact: number | null
          sleep_date: string
          sleep_quality: number | null
          source_platform: string | null
          source_platform_id: string | null
          user_id: string
          wake_time: string
        }
        Insert: {
          awake_minutes?: number | null
          bedtime: string
          created_at?: string
          deep_sleep_minutes?: number | null
          duration_minutes?: number | null
          id?: string
          light_sleep_minutes?: number | null
          notes?: string | null
          rem_sleep_minutes?: number | null
          score_impact?: number | null
          sleep_date: string
          sleep_quality?: number | null
          source_platform?: string | null
          source_platform_id?: string | null
          user_id: string
          wake_time: string
        }
        Update: {
          awake_minutes?: number | null
          bedtime?: string
          created_at?: string
          deep_sleep_minutes?: number | null
          duration_minutes?: number | null
          id?: string
          light_sleep_minutes?: number | null
          notes?: string | null
          rem_sleep_minutes?: number | null
          score_impact?: number | null
          sleep_date?: string
          sleep_quality?: number | null
          source_platform?: string | null
          source_platform_id?: string | null
          user_id?: string
          wake_time?: string
        }
        Relationships: []
      }
      sleep_preferences: {
        Row: {
          created_at: string
          id: string
          onboarding_completed: boolean | null
          preferred_bedtime: string | null
          preferred_wake_time: string | null
          sleep_issues: string | null
          target_hours: number
          target_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean | null
          preferred_bedtime?: string | null
          preferred_wake_time?: string | null
          sleep_issues?: string | null
          target_hours?: number
          target_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean | null
          preferred_bedtime?: string | null
          preferred_wake_time?: string | null
          sleep_issues?: string | null
          target_hours?: number
          target_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_recommendations: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          score_reward: number | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          score_reward?: number | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          score_reward?: number | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_schedules: {
        Row: {
          active_days: string[] | null
          alarm_sound: string | null
          bedtime: string
          created_at: string
          id: string
          is_active: boolean | null
          repeat_alarm: string | null
          updated_at: string
          user_id: string
          vibration_enabled: boolean | null
          wake_time: string
        }
        Insert: {
          active_days?: string[] | null
          alarm_sound?: string | null
          bedtime?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          repeat_alarm?: string | null
          updated_at?: string
          user_id: string
          vibration_enabled?: boolean | null
          wake_time?: string
        }
        Update: {
          active_days?: string[] | null
          alarm_sound?: string | null
          bedtime?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          repeat_alarm?: string | null
          updated_at?: string
          user_id?: string
          vibration_enabled?: boolean | null
          wake_time?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: string[]
          icon: string
          id: string
          is_active: boolean
          is_popular: boolean
          limitations: string[]
          name: string
          period: string
          price_amount: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[]
          icon?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          limitations?: string[]
          name: string
          period?: string
          price_amount?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[]
          icon?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          limitations?: string[]
          name?: string
          period?: string
          price_amount?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_levels: {
        Row: {
          created_at: string
          id: string
          level: number
          title: string | null
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          title?: string | null
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_meal_plan_items: {
        Row: {
          calories: number | null
          carbs_grams: number | null
          category: string
          description: string | null
          fat_grams: number | null
          id: string
          logged_at: string | null
          meal_id: string | null
          plan_id: string
          protein_grams: number | null
          scheduled_date: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_grams?: number | null
          category: string
          description?: string | null
          fat_grams?: number | null
          id?: string
          logged_at?: string | null
          meal_id?: string | null
          plan_id: string
          protein_grams?: number | null
          scheduled_date: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_grams?: number | null
          category?: string
          description?: string | null
          fat_grams?: number | null
          id?: string
          logged_at?: string | null
          meal_id?: string | null
          plan_id?: string
          protein_grams?: number | null
          scheduled_date?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_meal_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_meal_plans: {
        Row: {
          allergens: string[] | null
          created_at: string
          dietary_restrictions: string[] | null
          end_date: string
          generation_log_id: string | null
          goal: string | null
          id: string
          start_date: string
          status: string
          target_daily_calories: number | null
          target_daily_protein_grams: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergens?: string[] | null
          created_at?: string
          dietary_restrictions?: string[] | null
          end_date: string
          generation_log_id?: string | null
          goal?: string | null
          id?: string
          start_date: string
          status?: string
          target_daily_calories?: number | null
          target_daily_protein_grams?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergens?: string[] | null
          created_at?: string
          dietary_restrictions?: string[] | null
          end_date?: string
          generation_log_id?: string | null
          goal?: string | null
          id?: string
          start_date?: string
          status?: string
          target_daily_calories?: number | null
          target_daily_protein_grams?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_meal_plans_generation_log_id_fkey"
            columns: ["generation_log_id"]
            isOneToOne: false
            referencedRelation: "ai_generation_log"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_workout_date: string | null
          longest_streak: number
          total_workouts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          total_workouts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          total_workouts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_workout_plan_items: {
        Row: {
          completed_at: string | null
          day_index: number
          estimated_calories: number | null
          estimated_duration_minutes: number | null
          exercises_snapshot: ExerciseSnapshot[] | null
          id: string
          notes: string | null
          plan_id: string
          scheduled_date: string
          sequence_in_day: number
          status: string
          user_id: string
          workout_description: string | null
          workout_id: string | null
          workout_source: string
          workout_title: string | null
        }
        Insert: {
          completed_at?: string | null
          day_index: number
          estimated_calories?: number | null
          estimated_duration_minutes?: number | null
          exercises_snapshot?: ExerciseSnapshot[] | null
          id?: string
          notes?: string | null
          plan_id: string
          scheduled_date: string
          sequence_in_day?: number
          status?: string
          user_id: string
          workout_description?: string | null
          workout_id?: string | null
          workout_source?: string
          workout_title?: string | null
        }
        Update: {
          completed_at?: string | null
          day_index?: number
          estimated_calories?: number | null
          estimated_duration_minutes?: number | null
          exercises_snapshot?: ExerciseSnapshot[] | null
          id?: string
          notes?: string | null
          plan_id?: string
          scheduled_date?: string
          sequence_in_day?: number
          status?: string
          user_id?: string
          workout_description?: string | null
          workout_id?: string | null
          workout_source?: string
          workout_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plan_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workout_plans: {
        Row: {
          created_at: string
          end_date: string
          generation_log_id: string | null
          goal: string | null
          id: string
          sessions_per_week: number | null
          start_date: string
          status: string
          target_duration_minutes: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          generation_log_id?: string | null
          goal?: string | null
          id?: string
          sessions_per_week?: number | null
          start_date: string
          status?: string
          target_duration_minutes?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          generation_log_id?: string | null
          goal?: string | null
          id?: string
          sessions_per_week?: number | null
          start_date?: string
          status?: string
          target_duration_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_plans_generation_log_id_fkey"
            columns: ["generation_log_id"]
            isOneToOne: false
            referencedRelation: "ai_generation_log"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workout_preferences: {
        Row: {
          created_at: string
          id: string
          last_workout_id: string | null
          last_workout_type: string | null
          preferred_duration_minutes: number | null
          preferred_equipment: string[] | null
          preferred_time: string | null
          preferred_workout_types: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_workout_id?: string | null
          last_workout_type?: string | null
          preferred_duration_minutes?: number | null
          preferred_equipment?: string[] | null
          preferred_time?: string | null
          preferred_workout_types?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_workout_id?: string | null
          last_workout_type?: string | null
          preferred_duration_minutes?: number | null
          preferred_equipment?: string[] | null
          preferred_time?: string | null
          preferred_workout_types?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          body_area: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          order_index: number
          reps: number | null
          sets: number | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
          workout_id: string
        }
        Insert: {
          body_area?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          order_index?: number
          reps?: number | null
          sets?: number | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
          workout_id: string
        }
        Update: {
          body_area?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          order_index?: number
          reps?: number | null
          sets?: number | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_preferences: {
        Row: {
          available_equipment: string[] | null
          created_at: string
          days_per_week: number
          fitness_level: string
          id: string
          onboarding_completed: boolean | null
          session_duration: number
          target_body_areas: string[] | null
          updated_at: string
          user_id: string
          workout_goal: string
        }
        Insert: {
          available_equipment?: string[] | null
          created_at?: string
          days_per_week?: number
          fitness_level: string
          id?: string
          onboarding_completed?: boolean | null
          session_duration?: number
          target_body_areas?: string[] | null
          updated_at?: string
          user_id: string
          workout_goal: string
        }
        Update: {
          available_equipment?: string[] | null
          created_at?: string
          days_per_week?: number
          fitness_level?: string
          id?: string
          onboarding_completed?: boolean | null
          session_duration?: number
          target_body_areas?: string[] | null
          updated_at?: string
          user_id?: string
          workout_goal?: string
        }
        Relationships: []
      }
      workout_progress: {
        Row: {
          calories_burned: number | null
          completed_at: string
          created_at: string | null
          current_exercise_index: number | null
          duration_seconds: number | null
          elapsed_seconds: number | null
          estimated_calories: number | null
          estimated_duration_minutes: number | null
          exercise_id: string | null
          exercises_snapshot: ExerciseSnapshot[] | null
          id: string
          notes: string | null
          paused_at: string | null
          status: string | null
          user_id: string
          workout_description: string | null
          workout_id: string | null
          workout_source: string
          workout_title: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string
          created_at?: string | null
          current_exercise_index?: number | null
          duration_seconds?: number | null
          elapsed_seconds?: number | null
          estimated_calories?: number | null
          estimated_duration_minutes?: number | null
          exercise_id?: string | null
          exercises_snapshot?: ExerciseSnapshot[] | null
          id?: string
          notes?: string | null
          paused_at?: string | null
          status?: string | null
          user_id: string
          workout_description?: string | null
          workout_id?: string | null
          workout_source?: string
          workout_title?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string
          created_at?: string | null
          current_exercise_index?: number | null
          duration_seconds?: number | null
          elapsed_seconds?: number | null
          estimated_calories?: number | null
          estimated_duration_minutes?: number | null
          exercise_id?: string | null
          exercises_snapshot?: ExerciseSnapshot[] | null
          id?: string
          notes?: string | null
          paused_at?: string | null
          status?: string | null
          user_id?: string
          workout_description?: string | null
          workout_id?: string | null
          workout_source?: string
          workout_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_progress_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          body_areas: string[] | null
          calories_burned: number | null
          category: string
          created_at: string
          description: string | null
          difficulty: string
          duration_minutes: number
          equipment: string[] | null
          id: string
          instructor_avatar: string | null
          instructor_name: string | null
          is_featured: boolean | null
          met_value: number | null
          rating: number | null
          rating_count: number | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
          workout_type: string | null
        }
        Insert: {
          body_areas?: string[] | null
          calories_burned?: number | null
          category: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          equipment?: string[] | null
          id?: string
          instructor_avatar?: string | null
          instructor_name?: string | null
          is_featured?: boolean | null
          met_value?: number | null
          rating?: number | null
          rating_count?: number | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
          workout_type?: string | null
        }
        Update: {
          body_areas?: string[] | null
          calories_burned?: number | null
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          equipment?: string[] | null
          id?: string
          instructor_avatar?: string | null
          instructor_name?: string | null
          is_featured?: boolean | null
          met_value?: number | null
          rating?: number | null
          rating_count?: number | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
          workout_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      coaches_public: {
        Row: {
          available_days: string[] | null
          available_hours_end: string | null
          available_hours_start: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          coaching_types: string[] | null
          created_at: string | null
          experience_years: number | null
          gallery_urls: string[] | null
          gender: string | null
          id: string | null
          is_available: boolean | null
          is_featured: boolean | null
          languages: string[] | null
          name: string | null
          price_per_session_max: number | null
          price_per_session_min: number | null
          rating: number | null
          review_count: number | null
          session_count: number | null
          specialties: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          available_days?: string[] | null
          available_hours_end?: string | null
          available_hours_start?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          coaching_types?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          gallery_urls?: string[] | null
          gender?: string | null
          id?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          languages?: string[] | null
          name?: string | null
          price_per_session_max?: number | null
          price_per_session_min?: number | null
          rating?: number | null
          review_count?: number | null
          session_count?: number | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          available_days?: string[] | null
          available_hours_end?: string | null
          available_hours_start?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          coaching_types?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          gallery_urls?: string[] | null
          gender?: string | null
          id?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          languages?: string[] | null
          name?: string | null
          price_per_session_max?: number | null
          price_per_session_min?: number | null
          rating?: number | null
          review_count?: number | null
          session_count?: number | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_user_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      apply_security_log_retention: { Args: never; Returns: number }
      award_points: {
        Args: { p_category?: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      calculate_level: { Args: { xp_amount: number }; Returns: number }
      check_and_award_badge: {
        Args: { p_badge_id: string; p_current_value: number; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier_hash: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_rate_limit_entries: { Args: never; Returns: number }
      get_level_title: { Args: { level_num: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_endpoint?: string
          p_event_data?: Json
          p_event_type: string
          p_ip_address_hash?: string
          p_severity: string
          p_user_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
