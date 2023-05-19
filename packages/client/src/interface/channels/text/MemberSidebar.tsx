import { For, Match, Show, Switch, createMemo, onMount } from "solid-js";

import { VirtualContainer } from "@minht11/solid-virtual-container";
import { Channel, ServerMember } from "revolt.js";

import { useClient } from "@revolt/client";
import { useTranslation } from "@revolt/i18n";
import { TextWithEmoji } from "@revolt/markdown";
import { userInformation } from "@revolt/markdown/users";
import {
  Avatar,
  Column,
  Deferred,
  MenuButton,
  OverflowingText,
  Row,
  Tooltip,
  Typography,
  UserStatus,
  UserStatusGraphic,
  Username,
  floating,
  scrollable,
  styled,
} from "@revolt/ui";
import { generateTypographyCSS } from "@revolt/ui/components/design/atoms/display/Typography";

floating;
scrollable;

interface Props {
  /**
   * Channel
   */
  channel: Channel;
}

/**
 * Member Sidebar
 */
export function MemberSidebar(props: Props) {
  return (
    <Switch>
      <Match when={props.channel.type === "TextChannel"}>
        <ServerMemberSidebar channel={props.channel} />
      </Match>
    </Switch>
  );
}

/**
 * Server Member Sidebar
 */
export function ServerMemberSidebar(props: Props) {
  const client = useClient();
  let scrollTargetElement!: HTMLDivElement;

  onMount(() => props.channel.server?.syncMembers(true));

  const roles = createMemo(() => {
    const hoistedRoles = props.channel.server!.orderedRoles.filter(
      (role) => role.hoist
    );

    const byRole: Record<string, ServerMember[]> = { default: [] };
    hoistedRoles.forEach((role) => (byRole[role.id] = []));

    const members = client().serverMembers.filter(
      (member) => member.id.server === props.channel.serverId
    );

    for (const member of members) {
      if (member.roles.length) {
        let assigned;
        for (const hoistedRole of hoistedRoles) {
          if (member.roles.includes(hoistedRole.id)) {
            byRole[hoistedRole.id].push(member);
            assigned = true;
            break;
          }
        }

        if (assigned) continue;
      }

      byRole["default"].push(member);
    }

    const result = [
      ...hoistedRoles.map((role) => ({
        ...role,
        members: byRole[role.id],
      })),
      {
        id: "default",
        name: "Default",
        members: byRole["default"],
      },
    ].filter((role) => role.members.length);

    result.forEach((role) =>
      role.members.sort(
        (a, b) =>
          (a.nickname ?? a.user?.username)?.localeCompare(
            b.nickname ?? b.user?.username ?? ""
          ) || 0
      )
    );

    return result;
  });

  return (
    <Base
      ref={scrollTargetElement}
      use:scrollable={{
        offsetTop: 48,
        direction: "y",
        showOnHover: true,
      }}
    >
      <div
        style={{
          width: "232px",
        }}
      >
        <CategoryTitle>
          <Row align>
            <UserStatus size="0.7em" status="Online" />
            {
              client().serverMembers.filter(
                (member) =>
                  (member.id.server === props.channel.serverId &&
                    member.user?.online) ||
                  false
              ).length
            }{" "}
            members online
          </Row>
        </CategoryTitle>

        <Deferred>
          <For each={roles()}>
            {(role) => (
              <div>
                <CategoryTitle>
                  {role.name} {"–"} {role.members.length}
                </CategoryTitle>

                <VirtualContainer
                  items={role.members}
                  scrollTarget={scrollTargetElement}
                  itemSize={{ height: 48 }}
                >
                  {(item) => (
                    <div
                      style={{
                        ...item.style,
                        width: "100%",
                        "padding-block": "3px",
                      }}
                    >
                      <Member member={item.item} />
                    </div>
                  )}
                </VirtualContainer>
              </div>
            )}
          </For>
        </Deferred>
      </div>
    </Base>
  );
}

/**
 * Base Styles
 */
const Base = styled.div`
  flex-shrink: 0;
  width: ${(props) => props.theme!.layout.width["channel-sidebar"]};
`;

/**
 * Category Title
 */
const CategoryTitle = styled.div`
  padding: 16px 14px 4px;
  color: ${(props) => props.theme!.colours["foreground-400"]};
  ${(props) => generateTypographyCSS(props.theme!, "category")}
`;

/**
 * Member
 */
function Member(props: { member: ServerMember }) {
  const t = useTranslation();

  /**
   * Create user information
   */
  const user = () => userInformation(props.member.user!, props.member);

  /**
   * Get user status
   */
  const status = () =>
    props.member.user?.statusMessage((presence) =>
      t(`app.status.${presence.toLowerCase()}`)
    );

  return (
    <div
      use:floating={{
        userCard: {
          user: props.member.user!,
          member: props.member,
        },
      }}
    >
      <MenuButton
        size="normal"
        icon={
          <Avatar
            src={user().avatar}
            size={32}
            holepunch="bottom-right"
            overlay={<UserStatusGraphic status={props.member.user?.presence} />}
          />
        }
      >
        <Column gap="none">
          <OverflowingText>
            <Username username={user().username} colour={user().colour} />
          </OverflowingText>
          <Show when={status()}>
            <Tooltip
              content={<TextWithEmoji content={status()!} />}
              placement="top-start"
              aria={status()!}
            >
              <OverflowingText>
                <Typography variant="status">
                  <TextWithEmoji content={status()!} />
                </Typography>
              </OverflowingText>
            </Tooltip>
          </Show>
        </Column>
      </MenuButton>
    </div>
  );
}