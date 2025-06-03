"use strict";

module.exports = (robot) => {
  console.log("🚀 Bot iniciando:", robot.name, "/", robot.alias);

  robot.brain.on("loaded", () => {
    if (!global.canBotRespondInLivechat)
      global.canBotRespondInLivechat = () => true;
  });

  robot.hear(/.*/, (res) => {
    const { user, text, room } = res.message;
    console.log(`📨 ${room} ${user.name}: "${text}"`);
  });

  robot.listenerMiddleware((ctx, next, done) => {
    const msg = ctx.response.message;
    const live = msg.user?.roomType === "l";
    if (
      live &&
      global.canBotRespondInLivechat &&
      !global.canBotRespondInLivechat(msg.room)
    )
      return done();
    next(done);
  });
};
