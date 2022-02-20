{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}

module Browser (
    getElementById,
    setTimeout,
    debug,
    withDebug,
    locationHash
) where

import Universum hiding (drop)
import FFI (procedure)
import Language.Javascript.JSaddle (JSM, jsg2, JSString, (!), FromJSVal (fromJSVal))
import JSDOM (currentDocument, currentWindow)
import qualified JSDOM.Types as JSDOM (Element)
import JSDOM.Generated.ParentNode (querySelector)
import Data.Time (NominalDiffTime)
import qualified Shpadoinkle.Console as SC (debug)
import Data.Text (drop)

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

locationHash :: JSM Text
locationHash = do
  debug "locationHash"
  Just win <- currentWindow
  hash <- win ! ("location" :: JSString) ! ("hash" :: JSString)
  Just h <- fromJSVal hash
  debug $ "locationHash: " <> h
  pure $ drop 1 h
