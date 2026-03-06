type ChannelsPageProps = {
  onOpenTelegram: () => void;
};

export function ChannelsPage({ onOpenTelegram }: ChannelsPageProps) {
  return (
    <>
      <section className="panel">
        <h2>Channels</h2>
        <p className="muted">Channels let OpenClaw receive and send messages in products like Telegram. Start with Telegram because it works with a simple bot token and does not require a public URL in the default setup.</p>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>Telegram</h2>
            <p className="muted">Recommended first channel for new users. Uses Telegram Bot API.</p>
          </div>
          <button className="btn" onClick={onOpenTelegram} type="button">
            Open Setup
          </button>
        </div>
        <p className="muted">You will create a bot in Telegram with BotFather, paste the bot token, save the configuration, and test the bot from your phone or desktop Telegram app.</p>
      </section>
    </>
  );
}
