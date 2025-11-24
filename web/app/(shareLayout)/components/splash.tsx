'use client'
import type { FC, PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { useCallback } from 'react'
import { useWebAppStore } from '@/context/web-app-context'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import AppUnavailable from '@/app/components/base/app-unavailable'
import { useTranslation } from 'react-i18next'
import { webAppLoginStatus, webAppLogout } from '@/service/webapp-auth'
import { fetchAccessToken } from '@/service/share'
import Loading from '@/app/components/base/loading'
import { setWebAppAccessToken, setWebAppPassport } from '@/service/webapp-auth'
import { AccessMode } from '@/models/access-control'

const Splash: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const shareCode = useWebAppStore(s => s.shareCode)
  const webAppAccessMode = useWebAppStore(s => s.webAppAccessMode)
  const embeddedUserId = useWebAppStore(s => s.embeddedUserId)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const redirectUrl = searchParams.get('redirect_url')
  const message = searchParams.get('message')
  const code = searchParams.get('code')
  const tokenFromUrl = searchParams.get('web_sso_token')
  const getSigninUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('message')
    params.delete('code')
    const redirectParams = new URLSearchParams(searchParams)
    redirectParams.delete('message')
    redirectParams.delete('code')
    redirectParams.delete('redirect_url')
    const redirectTarget = `${pathname}${redirectParams.toString() ? `?${redirectParams.toString()}` : ''}`
    params.set('redirect_url', redirectUrl || encodeURIComponent(redirectTarget))
    return `/webapp-signin?${params.toString()}`
  }, [pathname, redirectUrl, searchParams])

  const backToHome = useCallback(async () => {
    await webAppLogout(shareCode!)
    const url = getSigninUrl()
    router.replace(url)
  }, [getSigninUrl, router, webAppLogout, shareCode])

  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const shouldShowSignin = webAppAccessMode !== AccessMode.PUBLIC
    const isOnSigninPage = pathname.includes('/webapp-signin')

    if (message) {
      setIsLoading(false)
      return
    }

    if (tokenFromUrl)
      setWebAppAccessToken(tokenFromUrl)

    const redirectOrFinish = () => {
      if (redirectUrl)
        router.replace(decodeURIComponent(redirectUrl))
      else
        setIsLoading(false)
    }

    const proceedToAuth = () => {
      setIsLoading(false)
    }

    (async () => {
      // if access mode is public, user login is always true, but the app login(passport) may be expired
      const { userLoggedIn, appLoggedIn } = await webAppLoginStatus(shareCode!)
      if (!userLoggedIn && !appLoggedIn && shouldShowSignin && !isOnSigninPage) {
        router.replace(getSigninUrl())
        return
      }
      if (userLoggedIn && appLoggedIn) {
        redirectOrFinish()
      }
      else if (!userLoggedIn && !appLoggedIn) {
        proceedToAuth()
      }
      else if (!userLoggedIn && appLoggedIn) {
        redirectOrFinish()
      }
      else if (userLoggedIn && !appLoggedIn) {
        try {
          const { access_token } = await fetchAccessToken({
            appCode: shareCode!,
            userId: embeddedUserId || undefined,
          })
          setWebAppPassport(shareCode!, access_token)
          redirectOrFinish()
        }
        catch (error) {
          await webAppLogout(shareCode!)
          proceedToAuth()
        }
      }
    })()
  }, [
    shareCode,
    redirectUrl,
    router,
    message,
    webAppAccessMode,
    tokenFromUrl,
    embeddedUserId,
    pathname,
    getSigninUrl])

  if (message) {
    return <div className='flex h-full flex-col items-center justify-center gap-y-4'>
      <AppUnavailable className='h-auto w-auto' code={code || t('share.common.appUnavailable')} unknownReason={message} />
      <span className='system-sm-regular cursor-pointer text-text-tertiary' onClick={backToHome}>{code === '403' ? t('common.userProfile.logout') : t('share.login.backToHome')}</span>
    </div>
  }

  if (isLoading) {
    return <div className='flex h-full items-center justify-center'>
      <Loading />
    </div>
  }
  return <>{children}</>
}

export default Splash
