// Кэш ошибок { [errorText: string]: number(timestamp) }
const recentErrors = {};

// Сколько минут хранить «отправили уже эту ошибку?»
// const CACHE_MINUTES = 10 / 60; // 10 секунд для теста (0.1666 мин)
const CACHE_MINUTES = 30; // для реала, если нужно

/**
 * Проверяем, можно ли отправить эту ошибку (нет ли антиспама)
 * @param {string} errorText - текст ошибки (ключ)
 * @returns {boolean} true, если нужно отправить
 */
function shouldSendError(errorText) {
  const now = Date.now();

  // Если такой ошибки ещё не было — можно отправлять
  if (!recentErrors[errorText]) {
    return true;
  }

  // Если была, считаем, сколько минут прошло
  const lastTime = recentErrors[errorText];
  const diffMinutes = (now - lastTime) / 1000 / 60;

  // Разрешаем повторную отправку, если прошло больше CACHE_MINUTES
  return diffMinutes > CACHE_MINUTES;
}

/**
 * Фиксируем факт отправки ошибки (запоминаем текущее время)
 * @param {string} errorText
 */
function markErrorSent(errorText) {
  recentErrors[errorText] = Date.now();
}

module.exports = {
  shouldSendError,
  markErrorSent,
};
