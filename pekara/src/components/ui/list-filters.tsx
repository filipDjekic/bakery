'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input, Select } from './input';
import { Button } from './button';
type Filter = {
  name: string;
  label: string;
  type?: 'date';
  options?: { value: string; label: string }[];
};
export function ListFilters({
  searchLabel = 'Pretraga po nazivu',
  fields = [],
}: {
  searchLabel?: string;
  fields?: Filter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(params.get('q') ?? '');
  const [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setText(params.get('q') ?? '');
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [query],
  );
  function navigate(next: URLSearchParams) {
    next.delete('page');
    startTransition(() =>
      router.push(`${pathname}?${next}`, { scroll: false }),
    );
  }
  return (
    <form
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        const next = new URLSearchParams(query);
        if (text.trim()) next.set('q', text.trim());
        else next.delete('q');
        navigate(next);
      }}
      className="border-border bg-surface mb-5 flex flex-wrap items-end gap-3 rounded-xl border p-4"
    >
      <label className="min-w-48 flex-1 space-y-1 text-sm font-medium">
        {searchLabel}
        <Input
          type="search"
          aria-label={searchLabel}
          name="q"
          value={text}
          maxLength={120}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              const next = new URLSearchParams(query);
              if (value.trim()) next.set('q', value.trim());
              else next.delete('q');
              navigate(next);
            }, 300);
          }}
        />
      </label>
      {fields.map((field) => (
        <label
          key={field.name}
          className="min-w-36 space-y-1 text-sm font-medium"
        >
          {field.label}
          {field.type === 'date' ? (
            <Input
              type="date"
              aria-label={field.label}
              name={field.name}
              value={params.get(field.name) ?? ''}
              onChange={(event) => {
                if (timer.current) clearTimeout(timer.current);
                const next = new URLSearchParams(query);
                if (text.trim()) next.set('q', text.trim());
                else next.delete('q');
                if (event.target.value)
                  next.set(field.name, event.target.value);
                else next.delete(field.name);
                navigate(next);
              }}
            />
          ) : (
            <Select
              aria-label={field.label}
              name={field.name}
              value={params.get(field.name) ?? ''}
              onChange={(event) => {
                if (timer.current) clearTimeout(timer.current);
                const next = new URLSearchParams(query);
                if (text.trim()) next.set('q', text.trim());
                else next.delete('q');
                if (event.target.value)
                  next.set(field.name, event.target.value);
                else next.delete(field.name);
                navigate(next);
              }}
            >
              <option value="">Sve</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </label>
      ))}
      <Button type="submit" size="sm" disabled={pending}>
        Primeni
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setText('');
          const next = new URLSearchParams();
          if (params.get('view')) next.set('view', params.get('view')!);
          navigate(next);
        }}
      >
        Resetuj
      </Button>
      <span className="sr-only" role="status">
        {pending ? 'Učitavanje rezultata…' : ''}
      </span>
    </form>
  );
}
