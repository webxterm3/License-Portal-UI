"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { countries, defaultCountry, flagEmoji, type Country } from "@/lib/countries";

type Props = {
  /** full E.164-ish value, e.g. "+91" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// Longest dial code first, so "1876" (Jamaica) matches before "1" (US/Canada).
const byDialCodeDesc = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);

function parseValue(value: string): { country: Country; digits: string } {
  const stripped = value.replace(/^\+/, "");
  const match = byDialCodeDesc.find((c) => stripped.startsWith(c.dialCode));
  if (!match) return { country: defaultCountry, digits: stripped.replace(/\D/g, "") };
  return { country: match, digits: stripped.slice(match.dialCode.length).replace(/\D/g, "") };
}

export default function PhoneInput({ value, onChange, placeholder }: Props) {
  const parsed = useMemo(() => parseValue(value), [value]);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [digits, setDigits] = useState(parsed.digits);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function reposition() {
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left });
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.toLowerCase() === q
    );
  }, [query]);

  function selectCountry(c: Country) {
    setCountry(c);
    setOpen(false);
    onChange(digits ? `+${c.dialCode}${digits}` : "");
  }

  function onDigitsChange(raw: string) {
    const clean = raw.replace(/\D/g, "").slice(0, 14);
    setDigits(clean);
    onChange(clean ? `+${country.dialCode}${clean}` : "");
  }

  return (
    <div className="flex gap-2" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center gap-1.5 !w-auto px-2.5 shrink-0"
      >
        <span className="text-base leading-none">{flagEmoji(country.iso2)}</span>
        <span className="text-xs font-mono">+{country.dialCode}</span>
        <ChevronDown className="h-3.5 w-3.5 text-soft" />
      </button>

      <input
        className="input flex-1"
        inputMode="numeric"
        value={digits}
        onChange={(e) => onDigitsChange(e.target.value)}
        placeholder={placeholder ?? "1234567890"}
      />

      {open &&
        createPortal(
          // Portaled to <body> at a fixed, viewport-anchored position — the
          // trigger sits inside a backdrop-blur card, which traps any z-index
          // to that card's own stacking context, so the menu would otherwise
          // render behind later sections (e.g. the plan cards below it).
          <div
            ref={menuRef}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed z-[9999] w-72 max-h-80 card shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-line">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-soft" />
                <input
                  ref={searchRef}
                  className="input pl-8 !py-1.5 text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search country or code…"
                />
              </div>
            </div>
            <div className="overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-xs text-soft text-center">No matches</p>
              )}
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.iso2}
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bpdeep/10 transition-colors ${
                    c.iso2 === country.iso2 ? "bg-bpdeep/10" : ""
                  }`}
                >
                  <span className="text-base leading-none">{flagEmoji(c.iso2)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs font-mono text-soft">+{c.dialCode}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
