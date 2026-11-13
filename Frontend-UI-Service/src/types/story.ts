export interface Character {
  name: string;
  role: string;
  appearance: string;
  internal_conflict: string;
}

export interface Setting {
  world_name: string;
  description: string;
}

export interface BeatPlan {
  act: number;
  beat_title: string;
  description: string;
}

export interface CompletedBeat {
  act: number;
  beat_title: string;
  description: string;
  prose: string;
  image_prompt?: string;
  negative_prompt?: string;
  image_url?: string;
  image_local_path?: string;
}

export interface StoryOutline {
  title: string;
  logline: string;
  genre: string;
  tone: string;
  setting: Setting;
  characters: Character[];
  plot_beats: BeatPlan[];
}

export interface StoryState {
  session_id: string;
  user_concept: string;
  genre_tone?: string;
  outline?: StoryOutline;
  current_beat_index: number;
  completed_beats: CompletedBeat[];
  chat_history: { role: string; content: string }[];
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoryListItem {
  session_id: string;
  title: string;
  genre: string;
  status: string;
  completed_beats_count: number;
  total_beats: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceConfig {
  text_model: {
    provider: string;
    model_name: string;
    base_url?: string;
    temperature?: number;
    api_key?: string;
  };
  image_model: {
    provider: string;
    model_name: string;
    output_dir?: string;
    base_url?: string;
    api_key?: string;
  };
}
