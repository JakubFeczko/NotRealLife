-- PostgreSQL schema for goals + roadmap tasks + habits

CREATE TABLE goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  domain VARCHAR(20) NOT NULL DEFAULT 'career', -- health, career, learning
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, archived, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_goals_domain CHECK (domain IN ('health', 'career', 'learning'))
);

CREATE INDEX idx_goals_user_id ON goals(user_id);

CREATE TABLE roadmap_tasks (
  id UUID PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  notes TEXT,
  task_kind VARCHAR(20) NOT NULL, -- one_time, habit
  impact SMALLINT NOT NULL DEFAULT 3, -- 1..5
  difficulty SMALLINT NOT NULL DEFAULT 2, -- 1..3
  status VARCHAR(20) NOT NULL DEFAULT 'todo', -- todo, done
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_roadmap_tasks_impact CHECK (impact BETWEEN 1 AND 5),
  CONSTRAINT ck_roadmap_tasks_difficulty CHECK (difficulty BETWEEN 1 AND 3)
);

CREATE INDEX idx_roadmap_tasks_goal_id ON roadmap_tasks(goal_id);
CREATE INDEX idx_roadmap_tasks_parent_id ON roadmap_tasks(parent_task_id);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'hard', -- hard, soft
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_task_dependency UNIQUE (task_id, depends_on_task_id),
  CONSTRAINT ck_task_dep_type CHECK (dependency_type IN ('hard', 'soft')),
  CONSTRAINT ck_task_dep_self CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

CREATE TABLE habit_settings (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL UNIQUE REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  duration_days INT NOT NULL,
  every_n_days INT NOT NULL,
  time_of_day VARCHAR(20), -- morning, afternoon, evening
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_duration_days_positive CHECK (duration_days > 0),
  CONSTRAINT ck_every_n_days_positive CHECK (every_n_days > 0)
);

CREATE TABLE habit_completions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_habit_completions_task_id ON habit_completions(task_id);
CREATE INDEX idx_habit_completions_completed_at ON habit_completions(completed_at);

-- Optional standalone habits (outside roadmap goals)
CREATE TABLE custom_habits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(220) NOT NULL,
  domain VARCHAR(20) NOT NULL DEFAULT 'career', -- health, career, learning
  start_date DATE NOT NULL,
  every_n_days INT NOT NULL,
  duration_days INT,
  impact SMALLINT NOT NULL DEFAULT 3, -- 1..5
  difficulty SMALLINT NOT NULL DEFAULT 2, -- 1..3
  time_of_day VARCHAR(20), -- morning, afternoon, evening
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_custom_habits_domain CHECK (domain IN ('health', 'career', 'learning')),
  CONSTRAINT ck_custom_habits_every_n_days_positive CHECK (every_n_days > 0),
  CONSTRAINT ck_custom_habits_duration_days_positive CHECK (duration_days IS NULL OR duration_days > 0),
  CONSTRAINT ck_custom_habits_impact CHECK (impact BETWEEN 1 AND 5),
  CONSTRAINT ck_custom_habits_difficulty CHECK (difficulty BETWEEN 1 AND 3)
);

CREATE INDEX idx_custom_habits_user_id ON custom_habits(user_id);

CREATE TABLE custom_habit_completions (
  id UUID PRIMARY KEY,
  custom_habit_id UUID NOT NULL REFERENCES custom_habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_habit_completions_habit_id ON custom_habit_completions(custom_habit_id);
CREATE INDEX idx_custom_habit_completions_completed_at ON custom_habit_completions(completed_at);

-- XP / progression
CREATE TABLE xp_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  task_id UUID REFERENCES roadmap_tasks(id) ON DELETE SET NULL,
  source_type VARCHAR(30) NOT NULL, -- task_one_time, task_habit, custom_habit, weekly_review
  source_key VARCHAR(255) NOT NULL, -- idempotency key
  domain VARCHAR(20) NOT NULL, -- health, career, learning
  xp_value INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_xp_source_key UNIQUE (user_id, source_key),
  CONSTRAINT ck_xp_domain CHECK (domain IN ('health', 'career', 'learning')),
  CONSTRAINT ck_xp_value_nonnegative CHECK (xp_value >= 0)
);

CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX idx_xp_events_domain ON xp_events(domain);
CREATE INDEX idx_xp_events_created_at ON xp_events(created_at);

-- Weekly Boss Review
CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  week_key DATE NOT NULL, -- monday date
  wins TEXT NOT NULL,
  blockers TEXT NOT NULL,
  next_plan TEXT NOT NULL,
  consistency_score SMALLINT NOT NULL, -- 1..5
  focus_domain VARCHAR(20) NOT NULL,
  xp_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_weekly_review UNIQUE (user_id, week_key),
  CONSTRAINT ck_weekly_review_score CHECK (consistency_score BETWEEN 1 AND 5),
  CONSTRAINT ck_weekly_review_domain CHECK (focus_domain IN ('health', 'career', 'learning')),
  CONSTRAINT ck_weekly_review_xp_nonnegative CHECK (xp_awarded >= 0)
);

CREATE INDEX idx_weekly_reviews_user_id ON weekly_reviews(user_id);
