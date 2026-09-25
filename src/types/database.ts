export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointment_messages: {
        Row: {
          appointment_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          read_at: string | null
          sender_profile_id: string
        }
        Insert: {
          appointment_id: string
          body: string
          created_at?: string
          id?: string
          organization_id: string
          read_at?: string | null
          sender_profile_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          read_at?: string | null
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          customer_profile_id: string
          during: unknown
          hairdresser_id: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          recurring_occurrence_id: string | null
          service_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          customer_profile_id: string
          during: unknown
          hairdresser_id: string
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          recurring_occurrence_id?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          customer_profile_id?: string
          during?: unknown
          hairdresser_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          recurring_occurrence_id?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hairdresser_id_fkey"
            columns: ["hairdresser_id"]
            isOneToOne: false
            referencedRelation: "hairdressers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_recurring_occurrence_fkey"
            columns: ["recurring_occurrence_id"]
            isOneToOne: false
            referencedRelation: "recurring_booking_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          hairdresser_id: string
          id: string
          organization_id: string
          reason: string | null
          start_time: string | null
          type: Database["public"]["Enums"]["availability_exception_type"]
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          hairdresser_id: string
          id?: string
          organization_id: string
          reason?: string | null
          start_time?: string | null
          type: Database["public"]["Enums"]["availability_exception_type"]
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          hairdresser_id?: string
          id?: string
          organization_id?: string
          reason?: string | null
          start_time?: string | null
          type?: Database["public"]["Enums"]["availability_exception_type"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_hairdresser_id_fkey"
            columns: ["hairdresser_id"]
            isOneToOne: false
            referencedRelation: "hairdressers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          hairdresser_id: string
          id: string
          location_id: string
          organization_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          hairdresser_id: string
          id?: string
          location_id: string
          organization_id: string
          start_time: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          hairdresser_id?: string
          id?: string
          location_id?: string
          organization_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_hairdresser_id_fkey"
            columns: ["hairdresser_id"]
            isOneToOne: false
            referencedRelation: "hairdressers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          created_at: string
          created_by: string | null
          during: unknown
          hairdresser_id: string
          id: string
          organization_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          during: unknown
          hairdresser_id: string
          id?: string
          organization_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          during?: unknown
          hairdresser_id?: string
          id?: string
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_hairdresser_id_fkey"
            columns: ["hairdresser_id"]
            isOneToOne: false
            referencedRelation: "hairdressers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hairdresser_services: {
        Row: {
          hairdresser_id: string
          service_id: string
        }
        Insert: {
          hairdresser_id: string
          service_id: string
        }
        Update: {
          hairdresser_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hairdresser_services_hairdresser_id_fkey"
            columns: ["hairdresser_id"]
            isOneToOne: false
            referencedRelation: "hairdressers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hairdresser_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      hairdressers: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          organization_id: string
          profile_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          organization_id: string
          profile_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          organization_id?: string
          profile_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hairdressers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hairdressers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hairdressers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hairdressers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          organization_id: string
          payload: Json
          recurring_booking_id: string | null
          type: Database["public"]["Enums"]["notification_event_type"]
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          payload?: Json
          recurring_booking_id?: string | null
          type: Database["public"]["Enums"]["notification_event_type"]
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          recurring_booking_id?: string | null
          type?: Database["public"]["Enums"]["notification_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_recurring_booking_id_fkey"
            columns: ["recurring_booking_id"]
            isOneToOne: false
            referencedRelation: "recurring_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          notification_event_id: string
          read_at: string | null
          recipient_profile_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          notification_event_id: string
          read_at?: string | null
          recipient_profile_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          notification_event_id?: string
          read_at?: string | null
          recipient_profile_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_notification_event_id_fkey"
            columns: ["notification_event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string
          profile_id: string
          role: Database["public"]["Enums"]["org_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id: string
          profile_id: string
          role: Database["public"]["Enums"]["org_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          created_at: string
          favicon_url: string | null
          id: string
          locale: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_booking_occurrences: {
        Row: {
          appointment_id: string | null
          conflict_reason: string | null
          created_at: string
          id: string
          occurrence_date: string
          organization_id: string
          recurring_booking_id: string
          status: Database["public"]["Enums"]["recurring_occurrence_status"]
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          conflict_reason?: string | null
          created_at?: string
          id?: string
          occurrence_date: string
          organization_id: string
          recurring_booking_id: string
          status?: Database["public"]["Enums"]["recurring_occurrence_status"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          conflict_reason?: string | null
          created_at?: string
          id?: string
          occurrence_date?: string
          organization_id?: string
          recurring_booking_id?: string
          status?: Database["public"]["Enums"]["recurring_occurrence_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_booking_occurrences_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_occurrences_recurring_booking_id_fkey"
            columns: ["recurring_booking_id"]
            isOneToOne: false
            referencedRelation: "recurring_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_bookings: {
        Row: {
          created_at: string
          customer_profile_id: string
          decided_at: string | null
          decided_by: string | null
          ends_on: string | null
          hairdresser_id: string
          id: string
          interval_weeks: number
          occurrence_count: number | null
          organization_id: string
          requested_at: string
          service_id: string
          start_time: string
          starts_on: string
          status: Database["public"]["Enums"]["recurring_booking_status"]
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          customer_profile_id: string
          decided_at?: string | null
          decided_by?: string | null
          ends_on?: string | null
          hairdresser_id: string
          id?: string
          interval_weeks?: number
          occurrence_count?: number | null
          organization_id: string
          requested_at?: string
          service_id: string
          start_time: string
          starts_on: string
          status?: Database["public"]["Enums"]["recurring_booking_status"]
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          customer_profile_id?: string
          decided_at?: string | null
          decided_by?: string | null
          ends_on?: string | null
          hairdresser_id?: string
          id?: string
          interval_weeks?: number
          occurrence_count?: number | null
          organization_id?: string
          requested_at?: string
          service_id?: string
          start_time?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["recurring_booking_status"]
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bookings_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "co_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_hairdresser_id_fkey"
            columns: ["hairdresser_id"]
            isOneToOne: false
            referencedRelation: "hairdressers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          organization_id: string
          price_cents: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          organization_id: string
          price_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          organization_id?: string
          price_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      co_member_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      notification_feed: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          customer_name: string | null
          during: unknown
          event_type:
            | Database["public"]["Enums"]["notification_event_type"]
            | null
          hairdresser_name: string | null
          notification_id: string | null
          read_at: string | null
          recurring_booking_id: string | null
          service_name: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_recurring_booking_id_fkey"
            columns: ["recurring_booking_id"]
            isOneToOne: false
            referencedRelation: "recurring_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_marketing_profile: {
        Row: {
          accent_color: string | null
          id: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          timezone: string | null
        }
        Insert: {
          accent_color?: string | null
          id?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Update: {
          accent_color?: string | null
          id?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      emit_notification_event: {
        Args: {
          p_appointment_id?: string
          p_recurring_booking_id?: string
          p_type: Database["public"]["Enums"]["notification_event_type"]
        }
        Returns: undefined
      }
      generate_recurring_occurrences: {
        Args: { p_horizon_weeks?: number; p_recurring_booking_id: string }
        Returns: undefined
      }
      is_org_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["org_role"]
          p_organization_id: string
        }
        Returns: boolean
      }
      is_own_hairdresser: {
        Args: { p_hairdresser_id: string }
        Returns: boolean
      }
      join_organization_as_customer: {
        Args: { p_slug: string }
        Returns: string
      }
      role_rank: {
        Args: { r: Database["public"]["Enums"]["org_role"] }
        Returns: number
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
        | "no_show"
      availability_exception_type:
        | "unavailable_all_day"
        | "unavailable_range"
        | "extra_range"
      notification_channel: "email" | "push" | "sms" | "whatsapp" | "in_app"
      notification_event_type:
        | "booking_created"
        | "booking_confirmed"
        | "booking_rejected"
        | "booking_cancelled"
        | "recurring_request_created"
        | "recurring_request_approved"
        | "recurring_request_rejected"
        | "reminder_24h"
        | "reminder_1h"
        | "schedule_changed"
        | "message_received"
      notification_status: "pending" | "sent" | "failed" | "read"
      org_role: "customer" | "hairdresser" | "manager" | "admin" | "owner"
      recurring_booking_status:
        | "pending_approval"
        | "active"
        | "rejected"
        | "cancelled"
      recurring_occurrence_status:
        | "scheduled"
        | "confirmed"
        | "conflict"
        | "cancelled"
        | "skipped"
        | "rescheduled"
        | "completed"
        | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "no_show",
      ],
      availability_exception_type: [
        "unavailable_all_day",
        "unavailable_range",
        "extra_range",
      ],
      notification_channel: ["email", "push", "sms", "whatsapp", "in_app"],
      notification_event_type: [
        "booking_created",
        "booking_confirmed",
        "booking_rejected",
        "booking_cancelled",
        "recurring_request_created",
        "recurring_request_approved",
        "recurring_request_rejected",
        "reminder_24h",
        "reminder_1h",
        "schedule_changed",
        "message_received",
      ],
      notification_status: ["pending", "sent", "failed", "read"],
      org_role: ["customer", "hairdresser", "manager", "admin", "owner"],
      recurring_booking_status: [
        "pending_approval",
        "active",
        "rejected",
        "cancelled",
      ],
      recurring_occurrence_status: [
        "scheduled",
        "confirmed",
        "conflict",
        "cancelled",
        "skipped",
        "rescheduled",
        "completed",
        "no_show",
      ],
    },
  },
} as const

