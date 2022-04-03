{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}

module Browser (
    getElementById,
    setTimeout,
    debug,
    withDebug,
    locationHash,
    setLocationHash
) where

import Universum hiding (drop)
import FFI (procedure)
import Language.Javascript.JSaddle (JSM, jsg2, JSString, (!), FromJSVal (fromJSVal), (<#), JSVal)
import JSDOM (currentDocument, currentWindow)
import qualified JSDOM.Types as JSDOM (Element)
import JSDOM.Generated.ParentNode (querySelector)
import Data.Time (NominalDiffTime)
import qualified Shpadoinkle.Console as SC (debug)
import Data.Text (drop)
import Data.Maybe (fromJust)

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
  Just doc <- currentDocument
  doc `querySelector` ("#" <> id_)

setTimeout :: NominalDiffTime -> JSM () -> JSM ()
setTimeout timeout callback = do
  debug "setTimeout"
  _ <- jsg2 @JSString "setTimeout" (procedure callback) $ round @NominalDiffTime @Int (timeout * 1000)
  pure ()

location :: JSM JSVal
location = (! ("location" :: JSString)) . fromJust =<< currentWindow

locationHash :: JSM Text
locationHash = withDebug "locationHash" $ do
  loc <- location
  hash <- loc ! ("hash" :: JSString)
  Just h <- fromJSVal hash
  pure $ drop 1 h

setLocationHash :: Text -> JSM ()
setLocationHash x = withDebug "setLocationHash" $ do
  loc <- location
  loc <# ("hash" :: JSString) $ x
  hash <- locationHash
  if x /= hash
    then loc <# ("hash" :: JSString) $ "#" <> x
    else pure ()