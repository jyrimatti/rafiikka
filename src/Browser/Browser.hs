{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# OPTIONS_GHC -Wno-orphans #-}

module Browser.Browser (
    getElementById,
    setTimeout,
    debug,
    withDebug,
    locationHash,
    setLocationHash,
    isSeed,
    isSafari,
    isLocal,
    Location(..),
    Progress(..)
) where

import Universum hiding (drop,get,Element)
import FFI (procedure)
import Language.Javascript.JSaddle (JSM, jsg2, JSString, (!), FromJSVal (fromJSVal), (<#), JSVal, ghcjsPure, jsUndefined, MakeObject)
import JSDOM (currentDocument, currentWindow)
import qualified JSDOM.Types as JSDOM (Element)
import JSDOM.Generated.ParentNode (querySelector)
import Data.Time (NominalDiffTime)
import qualified Shpadoinkle.Console as SC (debug)
import Data.Text (drop, isInfixOf, isSuffixOf)
import Data.Maybe (fromJust)
import Monadic (isDefined)
import GHC.Records (HasField (getField))
import GetSet (getObj,getVal)
import JSDOM.Types (Window,Element)

newtype Location = Location JSVal deriving MakeObject
instance HasField "location" Window (JSM Location) where
  getField = getObj Location "location"

instance HasField "hash" Location (JSM Text) where
  getField = getVal "hash"
  
newtype Progress = Progress Element deriving MakeObject
instance HasField "progress" Window (JSM Progress) where
  getField = getObj Progress "progress"
  
instance HasField "max" Progress (JSM Int) where
  getField = getVal "max"
instance HasField "value" Progress (JSM (Maybe Int)) where
  getField = getVal "value"
instance HasField "title" Progress (JSM (Maybe Text)) where
  getField = getVal "title"

__loggingEnabled :: Bool
__loggingEnabled = False

debug :: Text -> JSM ()
debug t = if __loggingEnabled
  then SC.debug @Show t
  else pure ()


withDebug :: Text -> JSM b -> JSM b
withDebug x f = do
  debug x
  ret <- f
  debug $ x <> " end"
  pure ret

getElementById :: Text -> JSM (Maybe JSDOM.Element)
getElementById id_ = do
  debug "getElementById"
  doc <- currentDocument
  if isNothing doc
    then pure Nothing
    else fromJust doc `querySelector` ("#" <> id_)

setTimeout :: NominalDiffTime -> JSM () -> JSM ()
setTimeout timeout callback = do
  debug "setTimeout"
  _ <- jsg2 @JSString "setTimeout" (procedure callback) $ round @NominalDiffTime @Int (timeout * 1000)
  pure ()

location :: JSM JSVal
location = do
  win <- currentWindow
  maybe (pure jsUndefined) (! ("location" :: JSString)) win

navigator :: JSM JSVal
navigator = do
  win <- currentWindow
  maybe (pure jsUndefined) (! ("navigator" :: JSString)) win

locationHash :: JSM Text
locationHash = withDebug "locationHash" $ do
  loc <- location
  hash <- loc ! ("hash" :: JSString)
  h <- fromJSVal hash
  if isNothing h
    then pure ""
    else pure $ drop 1 (fromJust h)

setLocationHash :: Text -> JSM ()
setLocationHash x = withDebug "setLocationHash" $ do
  loc <- location
  loc <# ("hash" :: JSString) $ x
  hash <- locationHash
  if x /= hash
    then loc <# ("hash" :: JSString) $ "#" <> x
    else pure ()

isSeed :: JSM Bool
isSeed = withDebug "isSeed" $ do
  hash <- locationHash
  pure $ hash == "#seed" || "&seed" `isSuffixOf` hash

-- // https://stackoverflow.com/a/31732310
isSafari :: JSM Bool
isSafari = do
  nav <- navigator

  vendor    <- nav ! ("vendor" :: JSString)
  userAgent <- nav ! ("userAgent" :: JSString)

  vendorDef    <- ghcjsPure $ isDefined vendor
  userAgentDef <- ghcjsPure $ isDefined userAgent

  if vendorDef && userAgentDef
    then do
      v <- fromJSVal vendor
      u <- fromJSVal userAgent
      if isNothing v || isNothing u
        then pure False
        else pure $ "Apple" `isInfixOf` fromJust v &&
             not ("CriOS" `isInfixOf` fromJust u) &&
             not ("FxiOS" `isInfixOf` fromJust u)
    else pure False

isLocal :: JSM Bool
isLocal = do
  loc <- location
  protocol <- loc ! ("protocol" :: JSString)
  protocolDef <- ghcjsPure $ isDefined protocol
  if protocolDef
    then do
      p <- fromJSVal protocol
      pure $ p == Just ("file:" :: Text)
    else pure False