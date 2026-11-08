import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { strings } from "../i18n/strings";
import { decodeAvatar, renderAvatar, type AvatarCrop } from "../lib/avatar";
import { uploadAvatar } from "../lib/avatarUpload";
import { AvatarCropper } from "./AvatarCropper";
import { useToast } from "./ui/Toast";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";

type Props = { uid: string; name: string; src: string | null; onUploaded: (url: string) => void | Promise<void>; label: string };

export function AvatarUpload({ uid, name, src, onUploaded, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const crop = useRef<AvatarCrop | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const close = () => {
    bitmap?.close();
    setBitmap(null);
    crop.current = null;
  };

  const onFile = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    try {
      setBitmap(await decodeAvatar(file));
    } catch {
      toast(strings.me.photoFailed, "error");
    }
  };

  const save = async () => {
    if (!bitmap || !crop.current) return;
    setBusy(true);
    try {
      const prepared = await renderAvatar(bitmap, crop.current);
      const url = await uploadAvatar(uid, prepared, src);
      close();
      await onUploaded(url);
    } catch {
      toast(strings.me.photoFailed, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label={label} onClick={() => input.current?.click()} disabled={busy} className="relative rounded-full">
        <Avatar src={src} name={name} size="xl" />
        <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-ink bg-cyan text-ink">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Camera size={16} aria-hidden />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      <Sheet open={!!bitmap} onClose={() => !busy && close()} title={strings.me.cropTitle}>
        {bitmap && (
          <>
            <AvatarCropper bitmap={bitmap} onChange={(c) => (crop.current = c)} />
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" full disabled={busy} onClick={close}>
                {strings.common.cancel}
              </Button>
              <Button full loading={busy} onClick={save}>
                {strings.me.cropSave}
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
