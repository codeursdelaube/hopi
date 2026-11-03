/**
 * Types de la base, écrits à la main d'après supabase/migrations/.
 * À tenir à jour à chaque migration (ou à régénérer avec `supabase gen types typescript`).
 */

export type Level = "A2" | "B1" | "B2";
export type Plan = "free" | "premium";
export type ExerciseType =
  "multiple_choice" | "match_pairs" | "fill_blank" | "order_words" | "listen_type" | "dialogue";
export type XpSource = "lesson" | "review" | "word_of_day" | "streak_bonus" | "challenge";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      fields: Table<
        {
          id: string;
          slug: string;
          name_fr: string;
          name_en: string;
          icon: string | null;
          is_published: boolean;
        },
        "slug" | "name_fr" | "name_en"
      >;
      units: Table<
        {
          id: string;
          field_id: string;
          level: Level;
          position: number;
          title_en: string;
          title_fr: string;
        },
        "field_id" | "level" | "position" | "title_en" | "title_fr"
      >;
      lessons: Table<
        { id: string; unit_id: string; position: number; title_en: string; xp_reward: number },
        "unit_id" | "position" | "title_en"
      >;
      terms: Table<
        {
          id: string;
          field_id: string;
          term: string;
          part_of_speech: string | null;
          definition_en: string;
          explanation_fr: string;
          example_en: string;
          example_fr: string | null;
          pronunciation_ipa: string | null;
          level: Level | null;
        },
        "field_id" | "term" | "definition_en" | "explanation_fr" | "example_en"
      >;
      exercises: Table<
        {
          id: string;
          lesson_id: string;
          term_id: string | null;
          type: ExerciseType;
          position: number;
          payload: unknown;
          explanation_fr: string | null;
        },
        "lesson_id" | "type" | "position" | "payload"
      >;
      daily_words: Table<
        { field_id: string; day: string; term_id: string },
        "field_id" | "day" | "term_id"
      >;
      badges: Table<
        {
          id: string;
          slug: string;
          name_fr: string;
          description_fr: string;
          icon: string | null;
          /** Badge réservé à l'offre Premium (cadenas pour les autres). */
          premium: boolean;
        },
        "slug" | "name_fr" | "description_fr"
      >;
      profiles: Table<
        {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          field_id: string | null;
          level: Level;
          daily_goal_xp: number;
          total_xp: number;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          plan: Plan;
          sound_enabled: boolean;
          notify_word_of_day: boolean;
          notify_reviews: boolean;
          reminder_hours: number[];
          tz_offset_minutes: number;
          last_reminder_at: string | null;
          last_seen_at: string;
          last_inactivity_push_at: string | null;
          inactivity_push_count: number;
          created_at: string;
        },
        "id"
      >;
      lesson_progress: Table<
        {
          user_id: string;
          lesson_id: string;
          best_score: number | null;
          completed_at: string | null;
        },
        "user_id" | "lesson_id"
      >;
      term_reviews: Table<
        {
          user_id: string;
          term_id: string;
          ease_factor: number;
          interval_days: number;
          repetitions: number;
          next_review_at: string;
          last_result: boolean | null;
        },
        "user_id" | "term_id"
      >;
      xp_events: Table<
        { id: number; user_id: string; amount: number; source: XpSource; created_at: string },
        "user_id" | "amount" | "source"
      >;
      push_subscriptions: Table<
        {
          id: number;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        },
        "user_id" | "endpoint" | "p256dh" | "auth"
      >;
      user_badges: Table<
        { user_id: string; badge_id: string; earned_at: string },
        "user_id" | "badge_id"
      >;
      challenges: Table<
        { id: string; creator_id: string; created_at: string; ends_at: string },
        "creator_id" | "ends_at"
      >;
      challenge_rooms: Table<
        {
          id: string;
          creator_id: string;
          field_id: string;
          puzzle: unknown;
          time_limit_seconds: number;
          created_at: string;
          ends_at: string;
        },
        "creator_id" | "field_id" | "puzzle" | "ends_at"
      >;
      challenge_room_players: Table<
        {
          room_id: string;
          user_id: string;
          started_at: string;
          finished_at: string | null;
          correct: number | null;
          total: number | null;
          duration_ms: number | null;
          xp: number | null;
          placements: Record<string, string> | null;
        },
        "room_id" | "user_id"
      >;
      challenge_participants: Table<
        { challenge_id: string; user_id: string; joined_at: string },
        "challenge_id" | "user_id"
      >;
    };
    Views: Record<never, never>;
    Functions: {
      weekly_leaderboard: {
        Args: { limit_count?: number };
        Returns: {
          display_name: string | null;
          avatar_url: string | null;
          weekly_xp: number;
          is_me: boolean;
        }[];
      };
      challenge_scores: {
        Args: { p_challenge_id: string };
        Returns: {
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          xp: number;
          joined_at: string;
        }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
