import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { strings } from "../i18n/strings";
import { decodeAvatar, renderAvatar, type AvatarCrop } from "../lib/avatar";
import { AVATAR_LIBRARY, libraryPreviewUrl, prepareLibraryAvatar, type LibraryAvatar } from "../lib/avatarLibrary";
import { uploadAvatar } from "../lib/avatarUpload";
import { AvatarCropper } from "./AvatarCropper";
import { useToast } from "./ui/Toast";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";

type Props = {
  uid: string;
  name: string;
  src: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  // Tira a foto (o perfil volta para as iniciais).
  onRemove: () => void | Promise<void>;
  label: string;
};

// Foto do perfil: tocar no avatar abre as opções (enviar uma foto, escolher um avatar pronto ou
// remover). A foto enviada passa pelo recorte antes de salvar.
export function AvatarUpload({ uid, name, src, onUploaded, onRemove, label }: Props) {
  const t = strings.me;
  const input = useRef<HTMLInputElement>(null);
  const crop = useRef<AvatarCrop | null>(null);
  const [menu, setMenu] = useState(false);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [busy, setBusy] = useState(false);
  // Avatar da biblioteca sendo salvo (mostra o carregando sobre ele).
  const [picking, setPicking] = useState<string | null>(null);
  const toast = useToast();

  const closeCrop = () => {
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
      toast(t.photoFailed, "error");
    }
  };

  const saveCrop = async () => {
    if (!bitmap || !crop.current) return;
    setBusy(true);
    try {
      const prepared = await renderAvatar(bitmap, crop.current);
      const url = await uploadAvatar(uid, prepared, src);
      closeCrop();
      await onUploaded(url);
    } catch {
      toast(t.photoFailed, "error");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (a: LibraryAvatar) => {
    if (busy) return;
    setBusy(true);
    setPicking(a.seed);
    try {
      const url = await uploadAvatar(uid, await prepareLibraryAvatar(a), src);
      setMenu(false);
      await onUploaded(url);
    } catch {
      toast(t.avatarFailed, "error");
    } finally {
      setBusy(false);
      setPicking(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onRemove();
      setMenu(false);
    } catch {
      toast(strings.errors.generic, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label={label} onClick={() => setMenu(true)} disabled={busy} className="relative rounded-full">
        <Avatar src={src} name={name} size="xl" />
        <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-ink bg-cyan text-ink">
          {busy && !menu ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Camera size={16} aria-hidden />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />

      <Sheet open={menu} onClose={() => !busy && setMenu(false)} title={t.photoSheetTitle}>
        <div className="flex flex-col gap-5">
          <div className={`grid gap-2 ${src ? "grid-cols-2" : "grid-cols-1"}`}>
            <Button
              variant="secondary"
              full
              disabled={busy}
              icon={<ImagePlus size={18} aria-hidden />}
              onClick={() => {
                // O seletor de arquivo precisa abrir no mesmo toque (o iPhone bloqueia depois).
                input.current?.click();
                setMenu(false);
              }}
            >
              {t.uploadPhoto}
            </Button>
            {src && (
              <Button variant="danger" full disabled={busy} icon={<Trash2 size={18} aria-hidden />} onClick={() => void remove()}>
                {t.removePhoto}
              </Button>
            )}
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-muted">{t.avatarLibrary}</p>
            <ul className="grid grid-cols-4 gap-3">
              {AVATAR_LIBRARY.map((a, i) => (
                <li key={a.seed}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={t.avatarOption(i + 1)}
                    onClick={() => void pick(a)}
                    className="relative block aspect-square w-full overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-cyan/60 focus-visible:ring-cyan active:scale-95 disabled:opacity-60"
                  >
                    <img src={libraryPreviewUrl(a)} alt="" loading="lazy" className="size-full" />
                    {picking === a.seed && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-text">
                        <Loader2 size={20} className="animate-spin" aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">{t.avatarLibraryHint}</p>
          </div>
        </div>
      </Sheet>

      <Sheet open={!!bitmap} onClose={() => !busy && closeCrop()} title={t.cropTitle}>
        {bitmap && (
          <>
            <AvatarCropper bitmap={bitmap} onChange={(c) => (crop.current = c)} />
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" full disabled={busy} onClick={closeCrop}>
                {strings.common.cancel}
              </Button>
              <Button full loading={busy} onClick={saveCrop}>
                {t.cropSave}
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
