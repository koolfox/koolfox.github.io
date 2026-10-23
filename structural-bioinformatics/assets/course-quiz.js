/** Formative quiz evaluation and browser-state validation, independent of the DOM. */
export function gradeQuiz(quiz, choice) {
  if (!Number.isInteger(choice) || choice < 0 || choice >= quiz.options.length) {
    throw new RangeError('Choose one of the supplied options');
  }
  return { correct: choice === quiz.correct, explanation: quiz.explanation };
}
export function restoredRecord(value, quiz) {
  if (!value || value.id !== quiz.id || value.revision !== quiz.revision) {
    return { id:quiz.id, revision:quiz.revision, choice:null, notes:'', attempts:[] };
  }
  const valid = n => Number.isInteger(n) && n >= 0 && n < quiz.options.length;
  return {
    id:quiz.id, revision:quiz.revision,
    choice:valid(value.choice) ? value.choice : null,
    notes:typeof value.notes === 'string' ? value.notes.slice(0,10000) : '',
    attempts:Array.isArray(value.attempts) ? value.attempts.filter(a => a && valid(a.choice) && typeof a.at === 'string').slice(-20) : [],
  };
}
