import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Card, CreditAmount, EmptyState } from '@/components/Bits';
import { ErrorState, Skeleton } from '@/components/Skeleton';
import { IconCopy, IconTeam } from '@/components/icons';
import { api } from '@/api/api';
import { useInvalidateAll, useTeam, useTeamCredit, useTeamInvites } from '@/api/queries';
import { ApiError } from '@/api/errors';
import { dateLabel } from '@/lib/format';
import { useToast } from '@/store/ui';
import { confirmDialog } from '@/store/confirm';
import type { TeamCreditReason, TeamInvite, TeamMember, TeamRole } from '@/types/domain';
import styles from './TeamDetail.module.css';

const ROLE_LABEL: Record<TeamRole, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '팀원',
};

const TEAM_CREDIT_REASON: Record<TeamCreditReason, string> = {
  DEPOSIT_FROM_USER: '팀 크레딧 입금',
  SPEND_COLLECT: '팀 설문 응답 수집',
  ADJUSTMENT: '관리자 조정',
  REFUND: '환불',
};

export function TeamDetail() {
  const teamId = Number(useParams().id);
  const { data, isLoading, isError, refetch } = useTeam(teamId);
  const team = data?.team;
  const isAdmin = team?.role === 'OWNER' || team?.role === 'ADMIN';
  const isOwner = team?.role === 'OWNER';
  const invites = useTeamInvites(teamId, !!isAdmin);
  const credit = useTeamCredit(teamId);
  const invalidate = useInvalidateAll();
  const push = useToast((s) => s.push);

  const [depositAmount, setDepositAmount] = useState(10);
  const [depositing, setDepositing] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const activeInvite = useMemo(
    () => invites.data?.find((invite) => isInviteActive(invite)) ?? null,
    [invites.data],
  );

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      push(message, 'default');
    } catch {
      push('복사에 실패했어요.', 'warning');
    }
  };

  const copyInvite = (invite: TeamInvite) => {
    const url = `${window.location.origin}/teams?invite=${invite.code}`;
    copyText(url, '초대 링크를 복사했어요.');
  };

  const createInvite = async () => {
    setCreatingInvite(true);
    try {
      const invite = await api.createTeamInvite(teamId, { maxUses: 30, expiresInDays: 14 });
      invalidate();
      copyInvite(invite);
    } catch (err) {
      if (err instanceof ApiError) push(err.message, 'warning');
    } finally {
      setCreatingInvite(false);
    }
  };

  const revokeInvite = async (invite: TeamInvite) => {
    if (
      !(await confirmDialog({
        title: '초대코드를 폐기할까요?',
        body: '폐기한 코드는 다시 사용할 수 없어요.',
        confirmLabel: '폐기',
        tone: 'danger',
      }))
    ) {
      return;
    }
    try {
      await api.revokeTeamInvite(teamId, invite.id);
      invalidate();
      push('초대코드를 폐기했어요.', 'positive');
    } catch (err) {
      if (err instanceof ApiError) push(err.message, 'warning');
    }
  };

  const deposit = async (e: FormEvent) => {
    e.preventDefault();
    setDepositing(true);
    try {
      await api.depositTeamCredit(teamId, depositAmount);
      invalidate();
      push('팀 크레딧을 추가했어요.', 'positive');
    } catch (err) {
      if (err instanceof ApiError) push(err.message, 'warning');
    } finally {
      setDepositing(false);
    }
  };

  const changeRole = async (member: TeamMember, role: Exclude<TeamRole, 'OWNER'>) => {
    try {
      await api.updateTeamMemberRole(teamId, member.userId, role);
      invalidate();
      push('역할을 변경했어요.', 'positive');
    } catch (err) {
      if (err instanceof ApiError) push(err.message, 'warning');
    }
  };

  if (isError) {
    return (
      <AppShell back title="팀 상세">
        <ErrorState onRetry={() => refetch()} message="팀 정보를 불러오지 못했어요." />
      </AppShell>
    );
  }

  if (isLoading || !data || !team) {
    return (
      <AppShell back title="팀 상세">
        <div className={styles.loading}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={120} radius="var(--radius-lg)" />
          <Skeleton height={220} radius="var(--radius-lg)" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back title="팀 상세">
      <section className={styles.hero}>
        <span className={styles.teamIcon} aria-hidden>
          <IconTeam size={24} />
        </span>
        <div className={styles.heroBody}>
          <h1 className={styles.title}>{team.name}</h1>
          <p className="sm muted">{team.memberCount}명 · 팀 크레딧 {team.responseCredit}개</p>
        </div>
        <span className={styles.role}>{ROLE_LABEL[team.role]}</span>
      </section>

      <div className={styles.stats}>
        <Stat label="팀 크레딧" value={team.responseCredit} suffix="개" />
        <Stat label="팀원" value={team.memberCount} suffix="명" />
      </div>

      {isAdmin && (
        <Card as="section" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className="h3">초대</h2>
            <Button size="sm" loading={creatingInvite} onClick={createInvite}>
              코드 발급
            </Button>
          </div>
          {activeInvite ? (
            <InviteRow invite={activeInvite} onCopy={() => copyInvite(activeInvite)} onRevoke={() => revokeInvite(activeInvite)} />
          ) : (
            <p className="sm muted">사용 가능한 초대코드가 없어요.</p>
          )}
          {invites.data && invites.data.length > 0 && (
            <ul className={styles.inviteHistory}>
              {invites.data.slice(0, 5).map((invite) => (
                <li key={invite.id} className={styles.inviteMini}>
                  <span className="num">{invite.code}</span>
                  <span className="caption muted">
                    {invite.usedCount}/{invite.maxUses} · {invite.revokedAt ? '폐기됨' : dateLabel(invite.expiresAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card as="section" className={styles.section}>
        <h2 className="h3">팀 크레딧 추가</h2>
        <form className={styles.depositForm} onSubmit={deposit}>
          <label className={styles.amountField}>
            <span>입금할 크레딧</span>
            <input
              type="number"
              min={1}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <Button loading={depositing}>추가</Button>
        </form>
      </Card>

      <Card as="section" className={styles.section}>
        <h2 className="h3">팀원</h2>
        <ul className={styles.members}>
          {data.members.map((member) => (
            <li key={member.userId} className={styles.member}>
              <div className={styles.avatar} aria-hidden>
                {member.nickname[0]}
              </div>
              <div className={styles.memberBody}>
                <p className={styles.memberName}>{member.nickname}</p>
                <p className="caption muted">{member.email}</p>
              </div>
              {isOwner && member.role !== 'OWNER' ? (
                <select
                  className={styles.roleSelect}
                  value={member.role}
                  onChange={(e) => changeRole(member, e.target.value as Exclude<TeamRole, 'OWNER'>)}
                  aria-label={`${member.nickname} 역할`}
                >
                  <option value="ADMIN">관리자</option>
                  <option value="MEMBER">팀원</option>
                </select>
              ) : (
                <span className={styles.memberRole}>{ROLE_LABEL[member.role]}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card as="section" className={styles.section}>
        <h2 className="h3">팀 크레딧 내역</h2>
        {credit.isLoading ? (
          <Skeleton height={120} radius="var(--radius-lg)" />
        ) : !credit.data?.ledger.length ? (
          <EmptyState title="아직 팀 거래 내역이 없어요." />
        ) : (
          <ul className={styles.ledger}>
            {credit.data.ledger.map((entry) => (
              <li key={entry.id} className={styles.ledgerRow}>
                <div>
                  <p className="sm">{TEAM_CREDIT_REASON[entry.reason] ?? entry.reason}</p>
                  <p className="caption muted">
                    {entry.actorNickname ? `${entry.actorNickname} · ` : ''}
                    {dateLabel(entry.createdAt)}
                  </p>
                </div>
                <CreditAmount value={entry.delta} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}

function InviteRow({ invite, onCopy, onRevoke }: { invite: TeamInvite; onCopy: () => void; onRevoke: () => void }) {
  return (
    <div className={styles.inviteRow}>
      <div>
        <p className={styles.inviteCode}>
          <span className="num">{invite.code}</span>
        </p>
        <p className="caption muted">
          {invite.usedCount}/{invite.maxUses}회 사용 · {dateLabel(invite.expiresAt)} 만료
        </p>
      </div>
      <div className={styles.inviteActions}>
        <button className={styles.iconBtn} onClick={onCopy} aria-label="초대 링크 복사">
          <IconCopy size={18} />
        </button>
        <Button size="sm" variant="danger" onClick={onRevoke}>
          폐기
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        <span className="num">{value}</span>
        {suffix}
      </span>
      <span className="caption muted">{label}</span>
    </div>
  );
}

function isInviteActive(invite: TeamInvite) {
  return !invite.revokedAt && invite.usedCount < invite.maxUses && new Date(invite.expiresAt).getTime() > Date.now();
}
