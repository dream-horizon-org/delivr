### Multi-Deployment Testing

In our [getting started](../README.md#getting-started) docs, we illustrated how to configure the DOTA plugin using a specific deployment key. However, in order to effectively test your releases, it is critical that you leverage the `Staging` and `Production` deployments that are auto-generated when you first created your DOTA app (or any custom deployments you may have created). This way, you never release an update to your end users that you haven't been able to validate yourself.

*NOTE: Our client-side rollback feature can help unblock users after installing a release that resulted in a crash, and server-side rollbacks allow you to prevent additional users from installing a bad release once it's been identified. However, it's obviously better if you can prevent an erroneous update from being broadly released in the first place.*

Taking advantage of the `Staging` and `Production` deployments allows you to achieve a workflow like the following (feel free to customize!):

1. Release a DOTA update to your `Staging` deployment using the DOTA dashboard

2. Run your staging/beta build of your app, sync the update from the server, and verify it works as expected

3. Promote the tested release from `Staging` to `Production` using the DOTA dashboard

4. Run your production/release build of your app, sync the update from the server and verify it works as expected

*NOTE: If you want to take a more cautious approach, you can even choose to perform a "staged rollout" as part of #3, which allows you to mitigate additional potential risk with the update (like did your testing in #2 touch all possible devices/conditions?) by only making the production update available to a percentage of your users. Then, after waiting for a reasonable amount of time to see if any crash reports or customer feedback comes in, you can expand it to your entire audience through DOTA dashboard.*