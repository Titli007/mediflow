type FastApiValidationIssue = {
  loc?: unknown;
  msg?: unknown;
  detail?: unknown;
};

const getValidationPath = (loc: unknown): string | null => {
  if (!Array.isArray(loc)) return null;

  const parts = loc
    .slice(1)
    .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
    .map(String);

  return parts.length > 0 ? parts.join('.') : null;
};

const formatValidationIssue = (issue: unknown): string | null => {
  if (!issue || typeof issue !== 'object') return null;

  const typedIssue = issue as FastApiValidationIssue;
  const message = typeof typedIssue.msg === 'string' ? typedIssue.msg : null;
  const path = getValidationPath(typedIssue.loc);

  if (path && message) return `${path}: ${message}`;
  if (message) return message;
  if (typeof typedIssue.detail === 'string') return typedIssue.detail;

  return null;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') return fallback;

  const response = error as {
    message?: unknown;
    response?: {
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
  };

  const detail = response.response?.data?.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map(formatValidationIssue)
      .filter((item): item is string => Boolean(item));

    if (messages.length > 0) return messages.join(', ');
  }

  if (detail && typeof detail === 'object') {
    const nested = detail as { detail?: unknown; msg?: unknown; message?: unknown };
    if (typeof nested.detail === 'string') return nested.detail;
    if (typeof nested.msg === 'string') return nested.msg;
    if (typeof nested.message === 'string') return nested.message;
  }

  if (typeof response.response?.data?.message === 'string') {
    return response.response.data.message;
  }

  if (typeof response.message === 'string') {
    return response.message;
  }

  return fallback;
};
