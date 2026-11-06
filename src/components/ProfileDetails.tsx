import { Building2, ExternalLink, MapPin } from "lucide-react";
import { Chip } from "./ui/Chip";
import { Avatar } from "./ui/Avatar";
import { strings } from "../i18n/strings";
import { linkEntries, safeHttps } from "../lib/links";
import { profileName, type Profile } from "../lib/types";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const name = profileName(profile);
  return (
    <div className="flex flex-col items-center text-center">
      <Avatar src={profile.avatar_url} name={name} size="xl" />
      <h1 className="mt-3 break-words font-display text-2xl font-bold tracking-[-0.02em]">{name}</h1>
      {profile.handle && <p className="font-mono text-sm text-volt">@{profile.handle}</p>}
      {profile.seeker_verified && (
        <span className="mt-2 inline-flex items-center rounded-full bg-violet/20 px-2.5 py-1 text-xs font-semibold text-violet">{strings.ui.seeker}</span>
      )}
      {profile.headline && <p className="mt-2 max-w-80 break-words">{profile.headline}</p>}
      {(profile.company || profile.location) && (
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
          {profile.company && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} aria-hidden />
              {profile.company}
            </span>
          )}
          {profile.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} aria-hidden />
              {profile.location}
            </span>
          )}
        </p>
      )}
      {profile.bio && <p className="mt-4 max-w-96 whitespace-pre-line break-words text-left text-sm text-text/90">{profile.bio}</p>}
    </div>
  );
}

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </div>
    </div>
  );
}

export function ProfileExtras({ profile, labels }: { profile: Profile; labels?: { skills: string; lookingFor: string; offering: string } }) {
  const l = labels ?? { skills: strings.publicProfile.skills, lookingFor: strings.publicProfile.lookingFor, offering: strings.publicProfile.offering };
  return (
    <div className="flex flex-col gap-4">
      <ChipGroup title={l.skills} items={profile.skills} />
      <ChipGroup title={l.lookingFor} items={profile.looking_for} />
      <ChipGroup title={l.offering} items={profile.offering} />
    </div>
  );
}

export function LinkButtons({ profile }: { profile: Profile }) {
  const entries = linkEntries(profile.links).filter(([, url]) => safeHttps(url));
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(([key, url]) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-sm font-medium transition hover:border-muted/60"
          >
            {strings.me.linkLabels[key]}
            <ExternalLink size={14} className="text-muted" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
