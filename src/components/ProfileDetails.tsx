import { Building2, Cake, Copy, MapPin } from "lucide-react";
import { BrandIcon } from "./BrandIcon";
import { Chip } from "./ui/Chip";
import { Avatar } from "./ui/Avatar";
import { useToast } from "./ui/Toast";
import { strings } from "../i18n/strings";
import { formatBirthday, hasBirthday, shortAddress } from "../lib/format";
import { copyText } from "../lib/clipboard";
import { isUrl, linkEntries, safeHttps } from "../lib/links";
import { profileName, type ContactProfile, type Links } from "../lib/types";

export function ProfileHeader({ profile }: { profile: ContactProfile }) {
  const name = profileName(profile);
  return (
    <div className="flex flex-col items-center text-center">
      <Avatar src={profile.avatar_url} name={name} size="xl" />
      <h1 className="mt-3 break-words font-display text-2xl font-bold tracking-[-0.02em]">{name}</h1>
      {profile.handle && <p className="font-mono text-sm text-cyan">@{profile.handle}</p>}
      {profile.seeker_verified && (
        <span className="mt-2 inline-flex items-center rounded-full bg-lilac/20 px-2.5 py-1 text-xs font-semibold text-lilac">{strings.ui.seeker}</span>
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
      {hasBirthday(profile) && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
          <Cake size={14} aria-hidden />
          {formatBirthday(profile)}
        </p>
      )}
      {profile.bio && <p className="mt-4 max-w-96 whitespace-pre-line break-words text-left text-sm text-text/90">{profile.bio}</p>}
    </div>
  );
}

export function ChipGroup({ title, items }: { title: string; items: string[] }) {
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

export function ProfileExtras({ profile, labels }: { profile: ContactProfile; labels?: { skills: string; lookingFor: string; offering: string } }) {
  const l = labels ?? { skills: strings.publicProfile.skills, lookingFor: strings.publicProfile.lookingFor, offering: strings.publicProfile.offering };
  return (
    <div className="flex flex-col gap-4">
      <ChipGroup title={l.skills} items={profile.skills} />
      <ChipGroup title={l.lookingFor} items={profile.looking_for} />
      <ChipGroup title={l.offering} items={profile.offering} />
    </div>
  );
}

const linkCls =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-sm font-medium transition hover:border-muted/60";

export function LinkButtons({ links, wallet }: { links: Links; wallet?: string | null }) {
  const toast = useToast();
  const entries = linkEntries(links).filter(([key, v]) => (isUrl(v) ? safeHttps(v) : key === "discord"));
  if (entries.length === 0 && !wallet) return null;
  const copyValue = async (text: string) => toast((await copyText(text)) ? strings.common.copied : strings.errors.generic, "success");
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <li key={key} className="max-w-full">
          {isUrl(value) ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className={linkCls}>
              <BrandIcon k={key} size={18} />
              {strings.me.linkLabels[key]}
            </a>
          ) : (
            <button type="button" onClick={() => void copyValue(value)} className={linkCls}>
              <BrandIcon k={key} size={18} />
              <span className="truncate">
                {strings.me.linkLabels[key]} · {value}
              </span>
              <Copy size={14} className="shrink-0 text-muted" aria-hidden />
            </button>
          )}
        </li>
      ))}
      {wallet && (
        <li className="max-w-full">
          <button type="button" onClick={() => void copyValue(wallet)} className={linkCls}>
            <BrandIcon k="wallet" size={18} />
            <span className="font-mono">{shortAddress(wallet)}</span>
            <Copy size={14} className="shrink-0 text-muted" aria-hidden />
          </button>
        </li>
      )}
    </ul>
  );
}
