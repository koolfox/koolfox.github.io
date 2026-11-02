# اعدادِ مثال صفحات 46 و 47 ؛ این شمارش فرضی است، نه اجرای بازی یا آموزش یک عامل.
games = 100
frames_per_game = 200
wins = 12
if any(type(n) is not int for n in [games, frames_per_game, wins]) or games < 1 or frames_per_game < 2:
    raise ValueError("تعداد بازی باید مثبت و تعداد فریم دست‌کم2 باشد.")
if not 0 <= wins <= games:
    raise ValueError("تعداد برد نمی‌تواند منفی یا بیشتر از کل بازی‌ها باشد.")
# هر دو فریم متوالی یک تصویر تفاضلی می‌سازند؛ از 200 فریم، 199 تصمیم داریم.
decisions_per_game = frames_per_game - 1
losses = games - wins
# تصمیم‌های بازی برنده را می‌شماریم؛ این به معنی علت‌بودن همهٔ تصمیم‌ها برای برد نیست.
winning_game_decisions = wins * decisions_per_game
losing_game_decisions = losses * decisions_per_game
result = {"decisions_per_game": decisions_per_game,
          "total_decisions": games * decisions_per_game,
          "winning_game_decisions": winning_game_decisions,
          "losing_game_decisions": losing_game_decisions,
          "losses": losses}
