create table public.domains (
  id uuid not null default gen_random_uuid (),
  domain text not null,
  spam_score numeric(3, 1) not null,
  message text null,
  critical_urls text null,
  number_of_checks integer not null default 0,
  status public.status null,
  constraint domains_pkey primary key (id),
  constraint domains_domain_key unique (domain),
  constraint domains_number_of_checks_check check ((number_of_checks >= 0))
) TABLESPACE pg_default;

// enum
public.status	Clean, High Risk, Review


-- Create function to handle updates
CREATE OR REPLACE FUNCTION handle_domain_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Always increment the number of checks
    NEW.number_of_checks = OLD.number_of_checks + 1;
    
    -- Check if the new spam score is less than the current one
    IF NEW.spam_score < OLD.spam_score THEN
        -- Revert spam score, status, message and critical_urls to old values
        NEW.spam_score = OLD.spam_score;
        NEW.status = OLD.status;
        NEW.message = OLD.message;
        NEW.critical_urls = OLD.critical_urls;
    ELSE
        -- Update status based on spam score only if we're keeping the new score
        NEW.status = CASE 
            WHEN NEW.spam_score <= 3 THEN 'Clean'
            WHEN NEW.spam_score >= 8 THEN 'High Risk'
            ELSE 'Review'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER domain_update_trigger
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION handle_domain_update();

-- Create indices
CREATE INDEX idx_domains_id ON domains(id);  -- Index for id lookups

